import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { arquivarNc, historico, importar } from "@/back/servidor/repositorio";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { importar as lerCarga } from "@/front/planilha/importar";
import { lerPlanilha } from "@/front/planilha/ler";
import { DELETE, POST } from "./arquivo";
import { GET } from "./pacotes";

let banco: Awaited<ReturnType<typeof prepararRotas>>;
beforeEach(async () => {
  banco = await prepararRotas();
  await importarFixture(banco);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await banco.fechar();
});

type Papel = "equipe" | "dono";
const req = async (method: string, papel: Papel | null, codigo: string) =>
  requisicao(`/api/pacotes/${codigo}/arquivo`, { method, cookie: papel ? await cookie(papel) : undefined });
const arquivar = async (papel: Papel | null = "dono", codigo = "100002") => POST(await req("POST", papel, codigo), contexto(codigo));
const desarquivar = async (papel: Papel | null = "dono", codigo = "100002") => DELETE(await req("DELETE", papel, codigo), contexto(codigo));
const listar = async (papel: Papel) =>
  Object.fromEntries((await (await GET(requisicao("/api/pacotes", { cookie: await cookie(papel) }))).json()).pacotes.map((p: any) => [p.codigo, p.arquivadoEm]));
const carga = () => lerCarga(lerPlanilha(gerarXlsx()));
const eventos = async () => (await historico(banco, "100002")).map((e) => `${e.tipo}:${e.autor}`);

describe("/api/pacotes/:codigo/arquivo", () => {
  it("401 sem sessão, 403 para a equipe, 404, e 409 repetido", async () => {
    for (const acao of [arquivar, desarquivar]) {
      expect((await acao(null)).status).toBe(401);
      expect((await acao("equipe")).status).toBe(403);
      expect((await acao("dono", "777")).status).toBe(404);
    }
    expect((await desarquivar()).status).toBe(409);
    expect((await arquivar()).status).toBe(200);
    expect((await arquivar()).status).toBe(409);
  });

  it("arquivado some para a equipe, fica para o dono e volta ao desarquivar", async () => {
    const r = await arquivar();
    expect((await r.json()).pacote).toMatchObject({ arquivadoEm: expect.any(String), coluna: "aberto" });
    expect(Object.keys(await listar("equipe"))).toEqual(["100001"]);
    expect((await listar("dono"))["100002"]).toEqual(expect.any(String));
    expect((await (await desarquivar()).json()).pacote.arquivadoEm).toBeNull();
    expect((await eventos()).slice(0, 2)).toEqual(["pacote_desarquivado:dono", "pacote_arquivado:dono"]);
  });

  it("importar a mesma planilha mantém o arquivo; NC nova traz o card de volta", async () => {
    await arquivar();
    await importar(banco, "Maria", carga());
    expect((await listar("dono"))["100002"]).toEqual(expect.any(String));
    const c = carga();
    c.ncs.push({ ...c.ncs.find((n) => n.id === "9102")!, id: "9999" });
    await importar(banco, "Maria", c);
    expect(Object.keys(await listar("equipe"))).toContain("100002");
    expect((await eventos())[0]).toBe("pacote_desarquivado:importação");
  });

  it("desarquivar o card desarquiva também as NCs dele", async () => {
    await arquivarNc(banco, "100002", "9101");
    await arquivar();
    const p = (await (await desarquivar()).json()).pacote;
    expect(p.arquivadas).toEqual([]);
    expect(p.ncs.map((n: any) => n.id)).toContain("9101");
    expect(await eventos()).toContain("nc_desarquivada:dono");
  });
});
