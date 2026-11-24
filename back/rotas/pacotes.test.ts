import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookie, prepararRotas, requisicao } from "@/back/testes/rotas";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "@/front/planilha/ler";
import { importar as lerCarga } from "@/front/planilha/importar";
import { importar } from "@/back/servidor/repositorio";
import { GET } from "./pacotes";

let banco: Awaited<ReturnType<typeof prepararRotas>>;
beforeEach(async () => (banco = await prepararRotas()));
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await banco.fechar();
});

describe("GET /api/pacotes", () => {
  it("sem sessão: 401", async () => {
    expect((await GET(requisicao("/api/pacotes"))).status).toBe(401);
  });
  it("200 com os pacotes", async () => {
    await importar(banco, "Maria", lerCarga(lerPlanilha(gerarXlsx())));
    const r = await GET(requisicao("/api/pacotes", { cookie: await cookie("equipe") }));
    expect(r.status).toBe(200);
    const { pacotes } = await r.json();
    expect(pacotes.map((p: any) => p.codigo)).toEqual(["100001", "100002"]);
  });
});
