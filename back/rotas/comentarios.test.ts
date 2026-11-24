import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contexto, cookie, importarFixture, prepararRotas, requisicao } from "@/back/testes/rotas";
import { POST } from "./comentarios";

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

const post = async (corpo: unknown, codigo = "100002", logado = true) =>
  POST(
    requisicao(`/api/pacotes/${codigo}/comentarios`, { method: "POST", corpo, cookie: logado ? await cookie("equipe") : undefined }),
    contexto(codigo),
  );

describe("POST /api/pacotes/:codigo/comentarios", () => {
  it("401, 400 e 404", async () => {
    expect((await post({ autor: "Ana", texto: "oi" }, "100002", false)).status).toBe(401);
    expect((await post({ texto: "oi" })).status).toBe(400);
    expect((await post({ autor: "Ana", texto: " " })).status).toBe(400);
    expect((await post({ autor: "Ana", texto: "x".repeat(1001) })).status).toBe(400);
    expect((await post({ autor: "Ana", texto: "oi" }, "777")).status).toBe(404);
  });

  it("200 com o pacote e o comentário", async () => {
    const r = await post({ autor: "Ana", texto: "massa aplicada" });
    expect(r.status).toBe(200);
    expect((await r.json()).pacote.comentarios).toMatchObject([{ autor: "Ana", texto: "massa aplicada" }]);
  });
});
