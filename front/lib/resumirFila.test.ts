import { afterEach, describe, expect, it, vi } from "vitest";
import { pacoteVisao } from "@/front/testes/visao";
import { resumirFila } from "./resumirFila";

const resposta = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 });
afterEach(() => vi.unstubAllGlobals());

describe("resumirFila", () => {
  it("um por vez, pula Concluído e quem já tem resumo, e conta as falhas", async () => {
    const lista = [
      pacoteVisao(),
      pacoteVisao({ codigo: "100002", coluna: "corrigido" }),
      pacoteVisao({ codigo: "100003", resumoIA: true }),
      pacoteVisao({ codigo: "100004", coluna: "concluido" }),
    ];
    const f = vi.fn().mockResolvedValueOnce(resposta({ pacote: pacoteVisao({ resumoIA: true }) })).mockResolvedValueOnce(resposta({ pacote: lista[1], aviso: "A IA falhou." }));
    vi.stubGlobal("fetch", f);
    const progresso: string[] = [];
    const trocados: string[] = [];
    expect(await resumirFila(lista, (t) => progresso.push(t), (p) => trocados.push(p.codigo))).toBe(
      "1 de 2 pacotes resumidos; 1 ficou com o resumo local. Último aviso: A IA falhou.",
    );
    expect(f.mock.calls.map((c) => c[0])).toEqual(["/api/pacotes/100001/resumo", "/api/pacotes/100002/resumo"]);
    expect(progresso).toEqual(["Resumindo com IA: 1 de 2…", "Resumindo com IA: 2 de 2…"]);
    expect(trocados).toEqual(["100001", "100002"]);
  });

  it("para depois de 3 falhas seguidas", async () => {
    const f = vi.fn(async () => resposta({ pacote: pacoteVisao(), aviso: "Sem chave." }));
    vi.stubGlobal("fetch", f);
    const lista = Array.from({ length: 8 }, (_, i) => pacoteVisao({ codigo: String(i) }));
    expect(await resumirFila(lista, () => {}, () => {})).toBe("0 de 8 pacotes resumidos; 8 ficaram com o resumo local. Último aviso: Sem chave.");
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("nada a fazer", async () => {
    expect(await resumirFila([], () => {}, () => {})).toBe("Todos os cards já têm o resumo da IA.");
  });
});
