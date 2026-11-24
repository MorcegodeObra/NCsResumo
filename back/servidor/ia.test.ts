import { afterEach, describe, expect, it, vi } from "vitest";
import { linhaComLocais } from "@/compartilhado/dominio/agrupar";
import { gerarResumo, lerJSON, MAX_NCS, perguntarLLM } from "./ia";

const ncs = [
  { id: "9001", item: "Prumo", descricao: "torto", sublocal: "AP 1" },
  { id: "9002", item: "Esquadro", descricao: "fora", sublocal: "HALL A" },
  { id: "9003", item: "Limpeza", descricao: "entulho", sublocal: "" },
];
const responder = (r: unknown) => vi.fn().mockResolvedValue(typeof r === "string" ? r : JSON.stringify(r));
const gerar = (r: unknown) => gerarResumo("Alvenaria", ncs, responder(r));
const valida = { linhas: [{ texto: "Prumo e esquadro", ncs: ["n1", "n2"] }, { texto: "Limpeza", ncs: ["n3"] }] };

describe("prompt", () => {
  it("só ids curtos e campos cortados; o texto é tratado como dado", async () => {
    const perguntar = responder({ linhas: [{ texto: "x", ncs: ["n1"] }] });
    await gerarResumo("T".repeat(500), [{ id: "987654321", item: "i".repeat(500), descricao: "d\nd" + "d".repeat(500), sublocal: "s".repeat(500) }], perguntar);
    const [sistema, usuario] = perguntar.mock.calls[0];
    expect(sistema).toMatch(/dado/i);
    expect(sistema).toMatch(/ignor/i);
    expect(usuario).toBe(`Tarefa: ${"T".repeat(120)}\nNCs:\n- n1 | ${"i".repeat(120)} | ${("d d" + "d".repeat(500)).slice(0, 300)} | ${"s".repeat(60)}`);
    expect(usuario).not.toContain("987654321");
  });
  it("sem sublocal vira 'sem local'", async () => {
    const perguntar = responder(valida);
    await gerarResumo("Alvenaria", ncs, perguntar);
    expect(perguntar.mock.calls[0][1]).toContain("- n3 | Limpeza | entulho | sem local");
  });
  it("acima do máximo de NCs, ou sem nenhuma, não chama a IA", async () => {
    const perguntar = responder(valida);
    await expect(gerarResumo("x", Array.from({ length: MAX_NCS + 1 }, (_, i) => ({ ...ncs[0], id: String(i) })), perguntar)).rejects.toThrow(/300/);
    await expect(gerarResumo("x", [], perguntar)).rejects.toThrow();
    expect(MAX_NCS).toBe(300);
    expect(perguntar).not.toHaveBeenCalled();
  });
});

describe("validação da resposta (contracts/ia.md)", () => {
  it("resposta válida: ids reais, sem repetir na mesma linha", async () => {
    const r = await gerar({ linhas: [{ texto: " Prumo  e esquadro ", ncs: ["n1", "n2", "n1"] }, { texto: "Limpeza", ncs: ["n3", "n2"] }] });
    expect(r).toEqual([
      { texto: "Prumo e esquadro", ncs: ["9001", "9002"] },
      { texto: "Limpeza", ncs: ["9003", "9002"] },
    ]);
    expect(linhaComLocais(r[0].texto, ncs.filter((n) => r[0].ncs.includes(n.id)))).toBe("Prumo e esquadro (AP 1, HALL A) ×2");
  });
  it("texto cortado em 120", async () => {
    expect((await gerar({ linhas: [{ texto: "x".repeat(200), ncs: ["n1", "n2", "n3"] }] }))[0].texto).toHaveLength(120);
  });
  it.each([
    ["sem JSON", "desculpe"],
    ["JSON quebrado", "{linhas:}"],
    ["linhas não é lista", { linhas: "x" }],
    ["nenhuma linha", { linhas: [] }],
    ["31 linhas", { linhas: Array.from({ length: 31 }, () => ({ texto: "x", ncs: ["n1", "n2", "n3"] })) }],
    ["linha nula", { linhas: [null] }],
    ["texto vazio", { linhas: [{ texto: "  ", ncs: ["n1", "n2", "n3"] }] }],
    ["ncs não é lista", { linhas: [{ texto: "x", ncs: "n1" }] }],
    ["linha sem NC", { linhas: [...valida.linhas, { texto: "inventada", ncs: [] }] }],
    ["id inventado", { linhas: [{ texto: "x", ncs: ["n1", "n2", "n3", "n4"] }] }],
    ["id herdado de objeto", { linhas: [{ texto: "x", ncs: ["n1", "n2", "n3", "constructor"] }] }],
    ["NC faltando", { linhas: [{ texto: "x", ncs: ["n1", "n2"] }] }],
  ])("recusa: %s", async (_, r) => {
    await expect(gerar(r)).rejects.toThrow();
  });
  it("lerJSON tolera texto em volta", () => {
    expect(lerJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe("perguntarLLM", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it("sem chave não chama a rede", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(perguntarLLM("s", "u")).rejects.toThrow(/LLM_API_KEY/);
    expect(f).not.toHaveBeenCalled();
  });
  it("devolve o texto e tem tempo limite; erro HTTP vira erro", async () => {
    vi.stubEnv("LLM_API_KEY", "k");
    const f = vi.fn().mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "oi" } }] })).mockResolvedValueOnce(new Response("limite", { status: 429 }));
    vi.stubGlobal("fetch", f);
    expect(await perguntarLLM("s", "u")).toBe("oi");
    expect(f.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    await expect(perguntarLLM("s", "u")).rejects.toThrow(/429/);
  });
});
