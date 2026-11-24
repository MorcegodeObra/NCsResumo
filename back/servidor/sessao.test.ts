import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ErroHttp } from "./http";
import { criarCookie, exigirPapel, lerSessao, papelDaSenha, DURACAO_SESSAO_S } from "./sessao";

const SEGREDO = "s".repeat(40);
beforeEach(() => {
  vi.stubEnv("SENHA_EQUIPE", "senha-equipe");
  vi.stubEnv("SENHA_DONO", "senha-dono");
  vi.stubEnv("SEGREDO_SESSAO", SEGREDO);
});
afterEach(() => vi.unstubAllEnvs());

const statusDe = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    if (e instanceof ErroHttp) return e.status;
    throw e;
  }
  return 200;
};
const req = (cookie?: string) =>
  new NextRequest("http://localhost/api/x", { headers: cookie ? { cookie: `sessao=${cookie}` } : {} });

describe("papelDaSenha", () => {
  it("equipe e dono pela senha certa", () => {
    expect(papelDaSenha("senha-equipe")).toBe("equipe");
    expect(papelDaSenha("senha-dono")).toBe("dono");
  });
  it("senha errada, vazia ou que não é texto → null", () => {
    expect(papelDaSenha("errada")).toBeNull();
    expect(papelDaSenha("")).toBeNull();
    expect(papelDaSenha(undefined)).toBeNull();
    expect(papelDaSenha(123)).toBeNull();
  });

  describe("falha fechada", () => {
    it.each([
      ["SENHA_EQUIPE", ""],
      ["SENHA_DONO", ""],
      ["SEGREDO_SESSAO", ""],
      ["SEGREDO_SESSAO", "curto"],
    ])("%s = %j recusa todo login com 500", (nome, valor) => {
      vi.stubEnv(nome, valor);
      expect(statusDe(() => papelDaSenha("senha-equipe"))).toBe(500);
      expect(statusDe(() => papelDaSenha(""))).toBe(500);
    });
    it("senhas iguais recusam todo login", () => {
      vi.stubEnv("SENHA_DONO", "senha-equipe");
      expect(statusDe(() => papelDaSenha("senha-equipe"))).toBe(500);
    });
    it("a mensagem é a do contrato", () => {
      vi.stubEnv("SENHA_DONO", "");
      expect(() => papelDaSenha("x")).toThrow("Acesso não configurado no servidor.");
    });
  });
});

describe("cookie assinado", () => {
  it("dura 12 h", () => {
    expect(DURACAO_SESSAO_S).toBe(12 * 3600);
    const agora = Date.now();
    const c = criarCookie("equipe", agora);
    expect(lerSessao(c, agora + 11 * 3600_000)).toBe("equipe");
    expect(lerSessao(c, agora + 12 * 3600_000 + 1000)).toBeNull();
  });
  it("assinatura adulterada ou papel trocado é recusado", () => {
    const c = criarCookie("equipe");
    expect(lerSessao(c.replace(/.$/, (x) => (x === "a" ? "b" : "a")))).toBeNull();
    expect(lerSessao(c.replace("equipe", "dono"))).toBeNull();
    expect(lerSessao("lixo")).toBeNull();
    expect(lerSessao(undefined)).toBeNull();
  });
  it("cookie assinado com outro segredo é recusado", () => {
    const c = criarCookie("dono");
    vi.stubEnv("SEGREDO_SESSAO", "t".repeat(40));
    expect(lerSessao(c)).toBeNull();
  });
});

describe("exigirPapel", () => {
  it("sem cookie → 401", () => {
    expect(statusDe(() => exigirPapel(req(), "equipe"))).toBe(401);
  });
  it("equipe passa em equipe e é barrada em dono com 403", () => {
    const c = criarCookie("equipe");
    expect(exigirPapel(req(c), "equipe")).toBe("equipe");
    expect(statusDe(() => exigirPapel(req(c), "dono"))).toBe(403);
  });
  it("dono passa nos dois", () => {
    const c = criarCookie("dono");
    expect(exigirPapel(req(c), "equipe")).toBe("dono");
    expect(exigirPapel(req(c), "dono")).toBe("dono");
  });
});
