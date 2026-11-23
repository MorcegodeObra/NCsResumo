import { afterEach, describe, expect, it, vi } from "vitest";
import { entrar, ErroApi, papel, quandoSessaoExpirar, sair } from "./api";

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
const mockFetch = (...respostas: Response[]) => {
  const f = vi.fn();
  for (const r of respostas) f.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", f);
  return f;
};
afterEach(() => {
  vi.unstubAllGlobals();
  quandoSessaoExpirar(null);
});

describe("cliente da API", () => {
  it("entrar: POST /api/sessao com a senha em JSON", async () => {
    const f = mockFetch(resposta(200, { papel: "equipe" }));
    expect(await entrar("abc")).toBe("equipe");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("/api/sessao");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ senha: "abc" });
    expect(init.headers["content-type"]).toBe("application/json");
  });

  it("sair: DELETE /api/sessao", async () => {
    const f = mockFetch(resposta(200, { ok: true }));
    await sair();
    expect(f.mock.calls[0][0]).toBe("/api/sessao");
    expect(f.mock.calls[0][1].method).toBe("DELETE");
  });

  it("papel: GET /api/sessao; 401 vira null", async () => {
    mockFetch(resposta(200, { papel: "dono" }), resposta(401, { erro: "Entre com a senha para continuar." }));
    expect(await papel()).toBe("dono");
    expect(await papel()).toBeNull();
  });

  it("{ erro } vira ErroApi com status e a mensagem do servidor", async () => {
    mockFetch(resposta(401, { erro: "Senha incorreta." }));
    const e = (await entrar("x").catch((x) => x)) as ErroApi;
    expect(e).toBeInstanceOf(ErroApi);
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(401);
    expect(e.message).toBe("Senha incorreta.");
  });

  it("resposta sem JSON vira ErroApi com mensagem genérica", async () => {
    mockFetch(new Response("<html>", { status: 502 }));
    const e = (await sair().catch((x) => x)) as ErroApi;
    expect(e).toBeInstanceOf(ErroApi);
    expect(e.status).toBe(502);
    expect(e.message).toMatch(/502/);
  });

  it("um 401 de chamada autenticada avisa a página que a sessão caiu (mas não no login)", async () => {
    const aviso = vi.fn();
    quandoSessaoExpirar(aviso);
    mockFetch(resposta(401, { erro: "Senha incorreta." }), resposta(401, { erro: "x" }));
    await entrar("x").catch(() => {});
    expect(aviso).not.toHaveBeenCalled();
    await sair().catch(() => {});
    expect(aviso).toHaveBeenCalledTimes(1);
  });
});
