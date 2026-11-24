import { describe, expect, it } from "vitest";
import { assinatura } from "./assinatura";
import { montarVisao } from "./visao";

const a = { id: "1", item: "Prumo", descricao: "torto", sublocal: "AP 1" };
const b = { id: "2", item: "Esquadro", descricao: "fora", sublocal: "" };

describe("assinatura", () => {
  it("é um SHA-256 que não depende da ordem", () => {
    expect(assinatura([a, b])).toMatch(/^[0-9a-f]{64}$/);
    expect(assinatura([b, a])).toBe(assinatura([a, b]));
  });
  it.each(["id", "item", "descricao", "sublocal"])("muda quando muda %s", (campo) => {
    expect(assinatura([{ ...a, [campo]: "outro" }, b])).not.toBe(assinatura([a, b]));
  });
  it("muda quando uma NC entra ou sai", () => {
    expect(assinatura([a])).not.toBe(assinatura([a, b]));
  });
  it("não muda quando a NC passa de Aberta para Corrigida", () => {
    const p = { codigo: "1", tarefa: "", bloco: "", pavimento: "", equipes: "", saiuEm: null };
    const nc = { ...a, codigoPacote: "1", idItem: "1", origem: "fvs" as const, tipo: "", prazo: null, dataCorrecao: null, situacaoItem: "REPROVADA", ultimaInspecao: "2026-10-10T08:00:00" };
    const aberta = montarVisao(p, [nc], {}).ncs;
    const corrigida = montarVisao(p, [nc], { marcacoes: { "1": "Ana" } }).ncs;
    expect([aberta[0].situacao, corrigida[0].situacao]).toEqual(["aberta", "corrigida"]);
    expect(assinatura(corrigida)).toBe(assinatura(aberta));
  });
});
