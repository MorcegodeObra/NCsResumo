import { describe, expect, it } from "vitest";
import { juntarLocais, linhaComLocais, linhasLocais, menorPrazo, NOME_ORIGEM } from "./agrupar";

describe("juntarLocais", () => {
  it("junta apartamentos e halls em ordem; outros depois, sem repetir", () => {
    expect(juntarLocais(["AP 1", "AP 3", "HALL B", "AP 2", "HALL A", "ESCADA", "AP 1", "ESCADA"])).toBe(
      "AP 1-2-3, HALL A-B, ESCADA",
    );
  });
  it("hall sozinho fica com uma letra", () => {
    expect(juntarLocais(["HALL A", "AP 10", "AP 2"])).toBe("AP 2-10, HALL A");
  });
  it("ignora vazios", () => {
    expect(juntarLocais(["", ""])).toBe("");
  });
});

describe("menorPrazo", () => {
  it("menor data ISO, ignorando nulos", () => {
    expect(menorPrazo(["2026-10-25", null, "2026-10-21"])).toBe("2026-10-21");
    expect(menorPrazo([null])).toBeNull();
  });
});

describe("linhaComLocais", () => {
  it("texto + locais + contagem só quando n > 1", () => {
    expect(linhaComLocais("Planicidade", [{ sublocal: "AP 1" }, { sublocal: "AP 2" }])).toBe("Planicidade (AP 1-2) ×2");
    expect(linhaComLocais("Trupico nas PJ's", [{ sublocal: "AP 4" }])).toBe("Trupico nas PJ's (AP 4)");
    expect(linhaComLocais("Limpeza Final", [{ sublocal: "" }, { sublocal: "" }])).toBe("Limpeza Final ×2");
    expect(linhaComLocais("Limpeza Final", [{ sublocal: "" }])).toBe("Limpeza Final");
  });
});

describe("linhasLocais", () => {
  it("agrupa por item sem diferenciar acento e caixa, do maior para o menor, com os ids", () => {
    const linhas = linhasLocais([
      { id: "1", item: "Limpeza Final", sublocal: "" },
      { id: "2", item: "Planicidade", sublocal: "AP 1" },
      { id: "3", item: "LIMPEZA FINAL", sublocal: "AP 3" },
      { id: "4", item: "Limpéza final", sublocal: "" },
    ]);
    expect(linhas).toEqual([
      { texto: "Limpeza Final (AP 3) ×3", ncs: ["1", "3", "4"] },
      { texto: "Planicidade (AP 1)", ncs: ["2"] },
    ]);
  });

  it("não limita o número de linhas", () => {
    const ncs = Array.from({ length: 12 }, (_, i) => ({ id: String(i), item: `Item ${i}`, sublocal: "" }));
    expect(linhasLocais(ncs)).toHaveLength(12);
  });

  it("reproduz o card de referência do pacote 144683 (contracts/planilha.md)", () => {
    const aps = (n: number) => Array.from({ length: 8 }, (_, i) => `AP ${i + 1}`).slice(0, n);
    const grupo = (item: string, locais: string[], total: number) =>
      Array.from({ length: total }, (_, i) => ({ id: `${item}-${i}`, item, sublocal: locais[i % locais.length] }));
    const ncs = [
      ...grupo("Esquadro entre alvenarias", [...aps(8), "HALL A", "HALL B"], 22),
      ...grupo("Planicidade", [...aps(8), "HALL A", "HALL B"], 20),
      ...grupo("Trupico nas PJ's", ["AP 4"], 1),
      ...grupo("Limpeza Final", ["AP 7", "AP 8"], 2),
    ];
    expect(linhasLocais(ncs).map((l) => l.texto)).toEqual([
      "Esquadro entre alvenarias (AP 1-2-3-4-5-6-7-8, HALL A-B) ×22",
      "Planicidade (AP 1-2-3-4-5-6-7-8, HALL A-B) ×20",
      "Limpeza Final (AP 7-8) ×2",
      "Trupico nas PJ's (AP 4)",
    ]);
  });
});

it("NOME_ORIGEM", () => {
  expect(NOME_ORIGEM).toEqual({ fvs: "QUALIDADE", fiscalizacao: "FISCALIZAÇÃO" });
});
