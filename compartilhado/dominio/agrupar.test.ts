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
      { id: "1", item: "Limpeza Final", descricao: "", sublocal: "" },
      { id: "2", item: "Planicidade", descricao: "", sublocal: "AP 1" },
      { id: "3", item: "LIMPEZA FINAL", descricao: "", sublocal: "AP 3" },
      { id: "4", item: "Limpéza final", descricao: "", sublocal: "" },
    ]);
    expect(linhas).toEqual([
      { texto: "Limpeza Final (AP 3) ×3", ncs: ["1", "3", "4"] },
      { texto: "Planicidade (AP 1)", ncs: ["2"] },
    ]);
  });

  it("não limita o número de linhas", () => {
    const ncs = Array.from({ length: 12 }, (_, i) => ({ id: String(i), item: `Item ${i}`, descricao: "", sublocal: "" }));
    expect(linhasLocais(ncs)).toHaveLength(12);
  });

  it("reproduz o card de referência do pacote 144683 (contracts/planilha.md)", () => {
    const aps = (n: number) => Array.from({ length: 8 }, (_, i) => `AP ${i + 1}`).slice(0, n);
    const grupo = (item: string, locais: string[], total: number) =>
      Array.from({ length: total }, (_, i) => ({ id: `${item}-${i}`, item, descricao: "", sublocal: locais[i % locais.length] }));
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

describe("linhasLocais: NC bem descrita ganha linha própria (specs/002)", () => {
  const nc = (id: string, item: string, descricao: string, sublocal = "") => ({ id, item, descricao, sublocal });
  it("a bem descrita vem primeiro, com a descrição; as outras seguem no item", () => {
    expect(
      linhasLocais([
        nc("1", "Aspecto final", "aspecto"),
        nc("2", "Aspecto final", "armadura exposta no ap02", "AP 2"),
        nc("3", "Aspecto final", "fora do projeto", "AP 3"),
      ]),
    ).toEqual([
      { texto: "Armadura exposta no ap02 (AP 2)", ncs: ["2"] },
      { texto: "Aspecto final (AP 3) ×2", ncs: ["1", "3"] },
    ]);
  });
  it("mesmo item e mesma descrição (sem caixa, acento e pontuação) dividem a linha; número diferente não", () => {
    expect(
      linhasLocais([
        nc("1", "Integridade", "Muitos blocos trincados..", "AP 1"),
        nc("2", "Integridade", "muitos blocos trincados", "AP 2"),
        nc("3", "Locação", "Cotas divergentes apto 04"),
        nc("4", "Locação", "Cotas divergentes apto 05"),
      ]).map((l) => l.texto),
    ).toEqual(["Muitos blocos trincados.. (AP 1-2) ×2", "Cotas divergentes apto 04", "Cotas divergentes apto 05"]);
  });
  it.each([
    ["Esquadro entre alvenarias", "esquadro de paredes sala, cozinha e quartos"],
    ["Prumo", "prumo incompatível"],
    ["Prumo", "Parede div quarto com sala"],
    ["Prumo", "passa prato, entrada e fachada"],
    ["Planicidade", ""],
    ["Limpeza Final", "entulho"],
  ])("%s / %s não é bem descrita", (item, descricao) => {
    expect(linhasLocais([nc("1", item, descricao)])[0].texto).toBe(item);
  });
});
