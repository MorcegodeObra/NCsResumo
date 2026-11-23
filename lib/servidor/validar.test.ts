import { describe, expect, it } from "vitest";
import { ErroHttp } from "./http";
import { autor, listaIds, str, textoComentario } from "./validar";

const erro400 = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErroHttp && e.status === 400;
  }
  return false;
};

describe("str", () => {
  it("normaliza espaços, corta e ignora o que não é texto", () => {
    expect(str("  a   b  ")).toBe("a b");
    expect(str("x".repeat(400))).toHaveLength(300);
    expect(str("abcdef", 3)).toBe("abc");
    expect(str(42)).toBe("");
    expect(str(null)).toBe("");
  });
});

describe("autor (data-model.md marcacoes.autor, comentarios.autor)", () => {
  it("aceita de 1 a 60 caracteres", () => {
    expect(autor(" Maria ")).toBe("Maria");
    expect(autor("x".repeat(60))).toHaveLength(60);
  });
  it("recusa vazio e mais de 60 com 400", () => {
    expect(erro400(() => autor(""))).toBe(true);
    expect(erro400(() => autor("   "))).toBe(true);
    expect(erro400(() => autor(undefined))).toBe(true);
    expect(erro400(() => autor("x".repeat(61)))).toBe(true);
  });
});

describe("textoComentario (data-model.md comentarios.texto)", () => {
  it("aceita de 1 a 1000", () => {
    expect(textoComentario("ok")).toBe("ok");
    expect(textoComentario("x".repeat(1000))).toHaveLength(1000);
  });
  it("recusa vazio e mais de 1000", () => {
    expect(erro400(() => textoComentario(""))).toBe(true);
    expect(erro400(() => textoComentario("x".repeat(1001)))).toBe(true);
  });
});

describe("listaIds", () => {
  it("aceita lista de ids de texto, sem repetição", () => {
    expect(listaIds(["1", "2", "1"])).toEqual(["1", "2"]);
  });
  it("recusa lista vazia, que não é lista, com item inválido ou acima do limite", () => {
    expect(erro400(() => listaIds([]))).toBe(true);
    expect(erro400(() => listaIds("1"))).toBe(true);
    expect(erro400(() => listaIds(["1", 2]))).toBe(true);
    expect(erro400(() => listaIds([""]))).toBe(true);
    expect(erro400(() => listaIds(Array.from({ length: 3 }, (_, i) => String(i)), 2))).toBe(true);
  });
});
