import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { PUT } from "./resolucao";

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

const put = async (corpo: unknown, papel: "equipe" | "dono" | null = "dono", codigo = "100002") =>
  PUT(requisicao(`/api/pacotes/${codigo}/resolucao`, { method: "PUT", corpo, cookie: papel ? await cookie(papel) : undefined }), contexto(codigo));

describe("PUT /api/pacotes/:codigo/resolucao", () => {
  it("401 sem sessão, 403 para a equipe, 400 e 404", async () => {
    expect((await put({ texto: "x" }, null)).status).toBe(401);
    expect((await put({ texto: "x" }, "equipe")).status).toBe(403);
    expect((await put({})).status).toBe(400);
    expect((await put({ texto: "x".repeat(1001) })).status).toBe(400);
    expect((await put({ texto: "x" }, "dono", "777")).status).toBe(404);
  });
  it("200 com o pacote; mantém as quebras de linha e aceita vazio", async () => {
    const r = await put({ texto: "  1. demolir\r\n2. refazer " });
    expect(r.status).toBe(200);
    expect((await r.json()).pacote.resolucao).toBe("1. demolir\n2. refazer");
    expect((await (await put({ texto: "" })).json()).pacote.resolucao).toBe("");
  });
});
