import { describe, expect, it } from "vitest";
import { data, dataHora, empresa, item, origem, pavimento, servico, situacaoItem, sublocal, texto } from "./normalizar";

describe("texto", () => {
  it("junta espaços, apara e trata '.' como vazio", () => {
    expect(texto("  esquadro   de  paredes ")).toBe("esquadro de paredes");
    expect(texto(".")).toBe("");
    expect(texto(" . ")).toBe("");
    expect(texto(undefined)).toBe("");
  });
});

describe("datas", () => {
  it("data: dd/mm/aaaa com ou sem hora vira aaaa-mm-dd", () => {
    expect(data("21/10/2026 00:00:00")).toBe("2026-10-21");
    expect(data("01/02/2026")).toBe("2026-02-01");
  });
  it("dataHora: vira ISO sem fuso", () => {
    expect(dataHora("23/10/2026 11:01:29")).toBe("2026-10-23T11:01:29");
    expect(dataHora("23/10/2026")).toBe("2026-10-23T00:00:00");
  });
  it("valor inválido ou vazio vira null", () => {
    expect(data("")).toBeNull();
    expect(data("31/02/2026")).toBeNull();
    expect(data("abc")).toBeNull();
    expect(dataHora("32/10/2026 10:00:00")).toBeNull();
  });
});

describe("origem", () => {
  it("fiscalização pela Descrição FVS, sem diferenciar caixa e acento", () => {
    expect(origem("2767 - FISCALIZAÇÃO 05.02 - Alvenaria")).toBe("fiscalizacao");
    expect(origem("fiscalizacao 05")).toBe("fiscalizacao");
    expect(origem("2756 - FVS 05.02 - Alvenaria Estrutural")).toBe("fvs");
  });
});

describe("situacaoItem", () => {
  it("maiúsculas e sem espaços nas pontas", () => {
    expect(situacaoItem(" Aprovado após inspecao ")).toBe("APROVADO APÓS INSPECAO");
  });
});

// Exemplos de contracts/planilha.md, "Formatação para o card".
describe("formatação para o card", () => {
  it.each([
    ["4828 - SERVIÇO DE EXECUÇÃO DE ALVENARIA - 15CM PAVTO TIPO - BLOCO PADRÃO NOVO", "Alvenaria"],
    ["4827 - SERVIÇO DE EXECUÇÃO DE GRAUTEAMENTO DA ALVENARIA - 15CM TÉRREO", "Grauteamento da alvenaria"],
    ["4784 - INDUSTRIALIZAÇÃO DE LAJE PRÉ MOLDADA (PRODUÇÃO, TRANSPORTE E MONTAGEM)", "Industrialização de laje pré moldada"],
    ["4786 - SERVIÇO EXECUÇÃO DE PRÉ LAJE COM ARMADURA NEGATIVA", "Pré laje com armadura negativa"],
  ])("serviço %s", (entrada, esperado) => expect(servico(entrada)).toBe(esperado));

  it.each([
    ["3 º Pavimento - 3", "3º PAV."],
    ["PAVIMENTO TÉRREO - 1", "TÉRREO"],
    ["Alvenaria 3 º Pav - b7 - 3", "3º PAV."],
    ["Instalações hidrossanitárias 2º Pav - b3 - 2", "2º PAV."],
    ["RADIER - 12", "RADIER - 12"],
  ])("pavimento %s", (entrada, esperado) => expect(pavimento(entrada)).toBe(esperado));

  it.each([
    [["7841-RPR"], "RPR"],
    [["16044-EJL ,7839-EJL"], "EJL"],
    [["3457-FORCE ONE,7565-NO PRUMO,7566-FORCE ONE"], "FORCE ONE / NO PRUMO"],
    [["16054-NOPRUMO,7849-NO PRUMO"], "NOPRUMO / NO PRUMO"],
    [["7841-RPR", "", "7841-RPR"], "RPR"],
    [[""], ""],
  ])("empresa %j", (entrada, esperado) => expect(empresa(entrada)).toBe(esperado));

  it("item: tira o código do começo", () => {
    expect(item("364 - Esquadro entre alvenarias")).toBe("Esquadro entre alvenarias");
    expect(item("Sem código")).toBe("Sem código");
  });

  it.each([
    ["BL 6 - 3° PAV - AP 01 95%", "AP 1"],
    ["BL 6 - 3° PAV - AP 08_ 95%", "AP 8"],
    ["BLOCO 3 - 3° PAV - AP7 -95%", "AP 7"],
    ["apto 4 95%", "AP 4"],
    ["Apartamento 2", "AP 2"],
    ["AP03", "AP 3"],
    ["Apto 2 - 95%", "AP 2"],
    ["hall b", "HALL B"],
    ["BL 6 - 3° PAV - HALL A", "HALL A"],
    ["Bloco 2 - Térreo - AP 3", "AP 3"],
    [".Bloco 1 - Térreo - HALL B", "HALL B"],
    [".", ""],
    ["", ""],
    ["escada", "ESCADA"],
  ])("sublocal %s", (entrada, esperado) => expect(sublocal(entrada)).toBe(esperado));
});
