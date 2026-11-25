import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { desmarcar, historico, importar, marcar } from "@/back/servidor/repositorio";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { importar as lerCarga } from "@/front/planilha/importar";
import { lerPlanilha } from "@/front/planilha/ler";
import { DELETE, POST } from "./conclusao";
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

const URL = "/api/pacotes/100002/conclusao";
const ABERTAS = ["9102", "9103", "9104"];
type Papel = "equipe" | "dono";
const req = async (method: string, papel: Papel | null) => requisicao(URL, { method, cookie: papel ? await cookie(papel) : undefined });
const concluir = async (papel: Papel | null = "dono", codigo = "100002") => POST(await req("POST", papel), contexto(codigo));
const reabrir = async (papel: Papel | null = "dono") => DELETE(await req("DELETE", papel), contexto("100002"));
const listar = async (papel: Papel) =>
  Object.fromEntries((await (await GET(requisicao("/api/pacotes", { cookie: await cookie(papel) }))).json()).pacotes.map((p: any) => [p.codigo, p.coluna]));
const corrigir = () => marcar(banco, "100002", "Ana", ABERTAS);
const carga = () => lerCarga(lerPlanilha(gerarXlsx()));
const tipos = async () => (await historico(banco, "100002")).map((e) => e.tipo);

describe("/api/pacotes/:codigo/conclusao", () => {
  it("401 sem sessão, 403 para a equipe, 404 e 409 fora de Corrigido", async () => {
    for (const acao of [concluir, reabrir]) {
      expect((await acao(null)).status).toBe(401);
      expect((await acao("equipe")).status).toBe(403);
    }
    expect((await concluir("dono", "777")).status).toBe(404);
    expect((await concluir()).status).toBe(409);
  });

  it("concluído some para a equipe, continua para o dono e pode ser reaberto", async () => {
    await corrigir();
    const r = await concluir();
    expect(r.status).toBe(200);
    expect((await r.json()).pacote).toMatchObject({ coluna: "concluido", concluidoEm: expect.any(String) });
    expect(await listar("equipe")).toEqual({ "100001": "aberto" });
    expect(await listar("dono")).toMatchObject({ "100002": "concluido" });
    expect((await (await reabrir()).json()).pacote).toMatchObject({ coluna: "corrigido", concluidoEm: null });
    await reabrir();
    expect((await tipos()).filter((t) => t.startsWith("pacote_")).slice(0, 2)).toEqual(["pacote_reaberto", "pacote_concluido"]);
  });

  it("importar a mesma planilha mantém a conclusão", async () => {
    await corrigir();
    await concluir();
    await importar(banco, "Maria", carga());
    expect(await listar("dono")).toMatchObject({ "100002": "concluido" });
  });

  it("NC nova na importação traz o pacote de volta", async () => {
    await corrigir();
    await concluir();
    const c = carga();
    c.ncs.push({ ...c.ncs.find((n) => n.id === "9102")!, id: "9999", dataCorrecao: "2026-10-18" });
    await importar(banco, "Maria", c);
    expect(await listar("equipe")).toMatchObject({ "100002": "corrigido" });
    expect((await tipos())[0]).toBe("pacote_reaberto");
  });

  it("desmarcar derruba a conclusão, e corrigir de novo não a traz de volta", async () => {
    await corrigir();
    await concluir();
    expect((await desmarcar(banco, "100002", "Ana", ["9102"])).coluna).toBe("aberto");
    expect((await corrigir()).coluna).toBe("corrigido");
  });
});
