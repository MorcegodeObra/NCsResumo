import { describe, expect, it } from "vitest";
import { pacoteVisao } from "@/front/testes/visao";
import { buscar } from "./buscar";

const ps = [
  pacoteVisao(),
  pacoteVisao({ codigo: "100002", bloco: "Bloco 12", pavimento: "TÉRREO", tarefa: "Reboco externo", resolucao: "demolir", ncs: [], linhas: [] }),
];
const achar = (q: string) => buscar(ps, q).map((p) => p.codigo);

describe("buscar", () => {
  it.each(["bloco 1 alvenaria", "alvenaria bloco 1", "Bloco 1 · 3º PAV.", "bl 01 3 pavimento", "alvenaria 3º pav", "AP 8", "apto 08 planicidade", "ap 1", "hall a", "fora de plano", "não atendimento"])("%s acha só o 100001", (q) =>
    expect(achar(q)).toEqual(["100001"]));
  it.each(["100002", "terreo", "REBOCO", "bloco 12", "externo reboco", "demolir"])("%s acha só o 100002", (q) => expect(achar(q)).toEqual(["100002"]));
  it("vazio traz todos; termo que não existe, nenhum", () => {
    expect(achar("  ")).toHaveLength(2);
    expect(achar("alvenaria xyz")).toEqual([]);
  });
});
