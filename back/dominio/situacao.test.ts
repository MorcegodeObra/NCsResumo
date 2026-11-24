import { describe, expect, it } from "vitest";
import { colunaDoPacote, ncsVisiveis, situacaoNC } from "./situacao";

const base = { situacaoItem: "REPROVADA", ultimaInspecao: "2026-10-10T08:00:00", dataCorrecao: null };

describe("situacaoNC", () => {
  it.each(["APROVADA", "APROVADO APÓS INSPECAO", "NÃO SE APLICA"])("%s → concluída", (s) => {
    expect(situacaoNC({ ...base, situacaoItem: s }, false)).toBe("concluida");
  });
  it("concluída vence a marcação e a data de correção", () => {
    expect(situacaoNC({ ...base, situacaoItem: "APROVADA", dataCorrecao: "2026-10-01" }, true)).toBe("concluida");
  });
  it("REPROVADA com Data Real Correção → corrigida", () => {
    expect(situacaoNC({ ...base, dataCorrecao: "2026-10-18" }, false)).toBe("corrigida");
  });
  it("REPROVADA com marcação da equipe → corrigida", () => {
    expect(situacaoNC(base, true)).toBe("corrigida");
  });
  it("REPROVADA sem nada → aberta", () => {
    expect(situacaoNC(base, false)).toBe("aberta");
  });
  it("sem inspeção registrada nunca é concluída", () => {
    expect(situacaoNC({ ...base, situacaoItem: "APROVADA", ultimaInspecao: null }, false)).toBe("aberta");
  });
});

describe("ncsVisiveis", () => {
  const nc = (id: string, origem: "fvs" | "fiscalizacao", situacao: "aberta" | "corrigida" | "concluida") => ({ id, origem, situacao });
  it("com fiscalização não concluída, mostra só a fiscalização", () => {
    const v = ncsVisiveis([nc("1", "fiscalizacao", "aberta"), nc("2", "fvs", "aberta"), nc("3", "fiscalizacao", "concluida")]);
    expect(v.map((n) => n.id)).toEqual(["1"]);
  });
  it("com a fiscalização toda concluída, a FVS aparece", () => {
    const v = ncsVisiveis([nc("1", "fiscalizacao", "concluida"), nc("2", "fvs", "corrigida")]);
    expect(v.map((n) => n.id)).toEqual(["2"]);
  });
  it("tira as concluídas", () => {
    expect(ncsVisiveis([nc("1", "fvs", "concluida")])).toEqual([]);
  });
});

describe("colunaDoPacote", () => {
  it("saiu da planilha → concluído", () => {
    expect(colunaDoPacote("2026-11-20T10:00:00Z", [{ situacao: "aberta" }])).toBe("concluido");
  });
  it("sem NC visível → concluído", () => {
    expect(colunaDoPacote(null, [])).toBe("concluido");
  });
  it("alguma aberta → aberto (a menos avançada manda)", () => {
    expect(colunaDoPacote(null, [{ situacao: "corrigida" }, { situacao: "aberta" }])).toBe("aberto");
  });
  it("todas corrigidas → corrigido", () => {
    expect(colunaDoPacote(null, [{ situacao: "corrigida" }])).toBe("corrigido");
  });
});
