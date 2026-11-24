import { describe, expect, it, vi } from "vitest";
import { ErroHttp, erroResposta, respostaErro } from "./http";

describe("http", () => {
  it.each([400, 401, 403, 404, 413])("respostaErro %i devolve { erro } com o status", async (status) => {
    const r = respostaErro(status, "mensagem");
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual({ erro: "mensagem" });
  });

  it("ErroHttp vira a resposta com o próprio status e mensagem", async () => {
    const r = erroResposta(new ErroHttp(403, "Só o dono pode fazer isso."));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: "Só o dono pode fazer isso." });
  });

  it("erro inesperado vira 500 sem vazar detalhe interno", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = erroResposta(new Error("senha do banco: xyz"));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ erro: "Erro inesperado no servidor." });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
