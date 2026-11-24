import { afterEach, describe, expect, it, vi } from "vitest";
import {
  definirResolucao, desmarcar, entrar, enviarImportacao, ErroApi, excluir, historico, listarPacotes, marcar, papel, quandoSessaoExpirar, resumir, sair,
} from "./api";

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


describe("importação e kanban", () => {
  it("enviarImportacao: POST /api/importacoes com autor e carga; devolve as contagens", async () => {
    const contagens = { pacotes: 1, novos: 1, saidos: 0, voltaram: 0, ncs: 0, ncsNovas: 0, ncsMudaram: 0 };
    const f = mockFetch(resposta(200, { contagens }));
    const carga = { pacotes: [{ codigo: "1", tarefa: "", bloco: "", pavimento: "", equipes: "" }], ncs: [] };
    expect(await enviarImportacao("Maria", carga)).toEqual(contagens);
    expect(f.mock.calls[0][0]).toBe("/api/importacoes");
    expect(f.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ autor: "Maria", ...carga });
  });

  it("listarPacotes: GET /api/pacotes", async () => {
    const f = mockFetch(resposta(200, { pacotes: [{ codigo: "1" }] }));
    expect(await listarPacotes()).toEqual([{ codigo: "1" }]);
    expect(f.mock.calls[0][0]).toBe("/api/pacotes");
  });
});

describe("ações no pacote", () => {
  it.each([
    ["marcar", () => marcar("100001", "Ana", ["1"]), "POST", "marcacoes", { autor: "Ana", ncs: ["1"] }],
    ["desmarcar", () => desmarcar("100001", "Ana", ["1"]), "DELETE", "marcacoes", { autor: "Ana", ncs: ["1"] }],
    ["definirResolucao", () => definirResolucao("100001", "refazer"), "PUT", "resolucao", { texto: "refazer" }],
  ] as const)("%s: devolve o pacote", async (_, acao, metodo, caminho, corpo) => {
    const f = mockFetch(resposta(200, { pacote: { codigo: "100001" } }));
    expect(await acao()).toEqual({ codigo: "100001" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`/api/pacotes/100001/${caminho}`);
    expect(init.method).toBe(metodo);
    expect(JSON.parse(init.body)).toEqual(corpo);
  });

  it("historico: GET, devolve os eventos", async () => {
    const f = mockFetch(resposta(200, { eventos: [{ tipo: "comentario" }] }));
    expect(await historico("100001")).toEqual([{ tipo: "comentario" }]);
    expect(f.mock.calls[0][0]).toBe("/api/pacotes/100001/historico");
  });

  it("resumir: POST sem corpo, devolve o pacote e o aviso", async () => {
    const f = mockFetch(resposta(200, { pacote: { codigo: "1" }, aviso: "falhou" }));
    expect(await resumir("1")).toEqual({ pacote: { codigo: "1" }, aviso: "falhou" });
    expect(f.mock.calls[0][0]).toBe("/api/pacotes/1/resumo");
    expect(f.mock.calls[0][1]).toMatchObject({ method: "POST", body: undefined });
  });

  it("excluir: DELETE no pacote", async () => {
    const f = mockFetch(resposta(200, { ok: true }));
    await excluir("1");
    expect(f.mock.calls[0][0]).toBe("/api/pacotes/1");
    expect(f.mock.calls[0][1].method).toBe("DELETE");
  });
});
