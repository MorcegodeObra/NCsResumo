import { describe, expect, it } from "vitest";
import { ErroHttp } from "./http";
import { autor, listaIds, str, textoResolucao } from "./validar";

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

describe("autor (data-model.md marcacoes.autor)", () => {
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

describe("textoResolucao (pacotes.resolucao)", () => {
  it("aceita de 0 a 1000 e mantém as quebras de linha", () => {
    expect(textoResolucao("")).toBe("");
    expect(textoResolucao("x".repeat(1000))).toHaveLength(1000);
    expect(textoResolucao(" a\r\nb ")).toBe("a\nb");
  });
  it("recusa o que não é texto e mais de 1000", () => {
    expect(erro400(() => textoResolucao(undefined))).toBe(true);
    expect(erro400(() => textoResolucao("x".repeat(1001)))).toBe(true);
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

import { validarCargaImportacao } from "./validar";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "@/front/planilha/ler";
import { importar } from "@/front/planilha/importar";

describe("validarCargaImportacao", () => {
  const carga = () => importar(lerPlanilha(gerarXlsx())) as any;
  const status = (f: () => unknown) => {
    try {
      f();
      return 200;
    } catch (e) {
      return e instanceof ErroHttp ? e.status : -1;
    }
  };

  it("aceita a carga da fixture sem mudar nada", () => {
    const c = carga();
    expect(validarCargaImportacao(c)).toEqual(c);
  });

  it("corta os textos no tamanho máximo do data-model e ignora campos a mais", () => {
    const c = carga();
    c.pacotes[0].tarefa = "x".repeat(250);
    c.pacotes[0].extra = "não vai";
    c.ncs[0].descricao = "y".repeat(600);
    c.ncs[0].situacaoItem = "z".repeat(50);
    const v = validarCargaImportacao(c);
    expect(v.pacotes[0].tarefa).toHaveLength(200);
    expect("extra" in v.pacotes[0]).toBe(false);
    expect(v.ncs[0].descricao).toHaveLength(500);
    expect(v.ncs[0].situacaoItem).toHaveLength(40);
  });

  it("limites de quantidade dão 413", () => {
    const c = carga();
    c.pacotes = Array.from({ length: 501 }, (_, i) => ({ ...c.pacotes[0], codigo: String(i) }));
    expect(status(() => validarCargaImportacao(c))).toBe(413);
    const d = carga();
    d.ncs = Array.from({ length: 10_001 }, (_, i) => ({ ...d.ncs[0], id: String(i) }));
    expect(status(() => validarCargaImportacao(d))).toBe(413);
  });

  it.each([
    ["corpo sem listas", () => ({})],
    ["carga sem pacote (mandaria o quadro inteiro para Concluído)", () => ({ pacotes: [], ncs: [] })],
    ["pacote sem código numérico", (c: any) => ((c.pacotes[0].codigo = "MENTOR"), c)],
    ["pacote repetido", (c: any) => (c.pacotes.push({ ...c.pacotes[0] }), c)],
    ["NC repetida", (c: any) => (c.ncs.push({ ...c.ncs[0] }), c)],
    ["NC sem id", (c: any) => ((c.ncs[0].id = ""), c)],
    ["origem fora da lista", (c: any) => ((c.ncs[0].origem = "outra"), c)],
    ["NC de pacote fora da carga", (c: any) => ((c.ncs[0].codigoPacote = "777"), c)],
    ["prazo inválido", (c: any) => ((c.ncs[0].prazo = "2026-02-31"), c)],
    ["data de correção em outro formato", (c: any) => ((c.ncs[0].dataCorrecao = "21/10/2026"), c)],
    ["última inspeção inválida", (c: any) => ((c.ncs[0].ultimaInspecao = "ontem"), c)],
  ])("recusa com 400: %s", (_, estraga) => {
    expect(status(() => validarCargaImportacao(estraga(carga())))).toBe(400);
  });

  it("aceita datas nulas", () => {
    const c = carga();
    Object.assign(c.ncs[0], { prazo: null, dataCorrecao: null, ultimaInspecao: null });
    expect(status(() => validarCargaImportacao(c))).toBe(200);
  });
});
