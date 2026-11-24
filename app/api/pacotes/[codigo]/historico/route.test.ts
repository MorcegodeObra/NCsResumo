import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/tests/rotas";
import { GET } from "./route";

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

const get = async (codigo = "100002", logado = true) =>
  GET(requisicao(`/api/pacotes/${codigo}/historico`, { cookie: logado ? await cookie("equipe") : undefined }), contexto(codigo));

describe("GET /api/pacotes/:codigo/historico", () => {
  it("401 sem sessão; 404 para pacote sem nenhum evento", async () => {
    expect((await get("100002", false)).status).toBe(401);
    expect((await get("777")).status).toBe(404);
  });

  it("200 com os eventos, o mais antigo por último", async () => {
    const r = await get();
    expect(r.status).toBe(200);
    expect((await r.json()).eventos.at(-1)).toMatchObject({ tipo: "pacote_entrou", autor: "importação" });
  });
});
