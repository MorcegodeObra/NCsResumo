import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { historico, importar } from "@/back/servidor/repositorio";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { importar as lerCarga } from "@/front/planilha/importar";
import { lerPlanilha } from "@/front/planilha/ler";
import { DELETE, POST } from "./arquivoNc";
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
const chamar = async (rota: typeof POST, method: string, id: string, papel: Papel | null = "dono", codigo = "100002") =>
  rota(
    requisicao(`/api/pacotes/${codigo}/ncs/${id}/arquivo`, { method, cookie: papel ? await cookie(papel) : undefined }),
    { params: Promise.resolve({ codigo, id }) },
  );
const arquivar = (id: string, papel?: Papel | null, codigo?: string) => chamar(POST, "POST", id, papel, codigo);
const desarquivar = (id: string, papel?: Papel | null, codigo?: string) => chamar(DELETE, "DELETE", id, papel, codigo);
const pacote = async (r: Response) => (await r.json()).pacote;

describe("/api/pacotes/:codigo/ncs/:id/arquivo", () => {
  it("401, 403 para a equipe, 404 fora do pacote ou do formato, 409 fora de hora", async () => {
    expect((await arquivar("9101", null)).status).toBe(401);
    expect((await arquivar("9101", "equipe")).status).toBe(403);
    expect((await desarquivar("9101", "equipe")).status).toBe(403);
    expect((await arquivar("9001")).status).toBe(404); // é do 100001
    expect((await arquivar("a b")).status).toBe(404);
    expect((await arquivar("9006", "dono", "100001")).status).toBe(409); // concluída, não está visível
    expect((await desarquivar("9101")).status).toBe(409);
  });

  it("a NC sai do card, vai para arquivadas, e volta ao desarquivar", async () => {
    const p = await pacote(await arquivar("9101"));
    expect(p.ncs.map((n: any) => n.id)).not.toContain("9101");
    expect(p.arquivadas).toMatchObject([{ id: "9101", arquivadaEm: expect.any(String) }]);
    expect(p.arquivadoEm).toBeNull();
    expect((await pacote(await desarquivar("9101"))).arquivadas).toEqual([]);
    const evs = await historico(banco, "100002");
    expect(evs.slice(0, 2).map((e) => [e.tipo, e.idNc])).toEqual([["nc_desarquivada", "9101"], ["nc_arquivada", "9101"]]);
  });

  it("reimportar mantém a NC arquivada", async () => {
    await arquivar("9101");
    await importar(banco, "Maria", lerCarga(lerPlanilha(gerarXlsx())));
    expect((await pacote(await desarquivar("9101"))).ncs.map((n: any) => n.id)).toContain("9101");
  });

  it("todas as NCs visíveis arquivadas: o card vai para o arquivo e some para a equipe", async () => {
    for (const id of ["9101", "9102", "9103"]) await arquivar(id);
    expect((await pacote(await arquivar("9104"))).arquivadoEm).toEqual(expect.any(String));
    const equipe = (await (await GET(requisicao("/api/pacotes", { cookie: await cookie("equipe") }))).json()).pacotes;
    expect(equipe.map((p: any) => p.codigo)).toEqual(["100001"]);
  });
});
