import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookie, prepararRotas, requisicao } from "@/back/testes/rotas";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "@/front/planilha/ler";
import { importar } from "@/front/planilha/importar";
import { POST } from "./importacoes";

let banco: Awaited<ReturnType<typeof prepararRotas>>;
beforeEach(async () => (banco = await prepararRotas()));
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await banco.fechar();
});

const carga = () => importar(lerPlanilha(gerarXlsx()));
const post = async (corpo: unknown, papel: "equipe" | "dono" | null = "equipe", texto?: string) =>
  POST(requisicao("/api/importacoes", { method: "POST", corpo, texto, cookie: papel ? await cookie(papel) : undefined }));

describe("POST /api/importacoes", () => {
  it("sem sessão: 401", async () => {
    expect((await post({ autor: "Maria", ...carga() }, null)).status).toBe(401);
  });
  it("sem autor: 400", async () => {
    expect((await post(carga())).status).toBe(400);
  });
  it("carga inválida: 400; JSON quebrado: 400", async () => {
    expect((await post({ autor: "Maria", pacotes: [{ codigo: "x" }], ncs: [] })).status).toBe(400);
    expect((await post(undefined, "equipe", "{")).status).toBe(400);
  });
  it("corpo acima de 3 MB: 413", async () => {
    const r = await post(undefined, "equipe", JSON.stringify({ autor: "Maria", lixo: "x".repeat(3 * 1024 * 1024) }));
    expect(r.status).toBe(413);
  });
  it("200 com as contagens, e grava no banco com o autor", async () => {
    const r = await post({ autor: "Maria", ...carga() });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ contagens: { pacotes: 2, novos: 2, saidos: 0, voltaram: 0, ncs: 14, ncsNovas: 14, ncsMudaram: 0 } });
    expect(await banco.consulta("SELECT autor FROM importacoes")).toEqual([{ autor: "Maria" }]);
  });
});
