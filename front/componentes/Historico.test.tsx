// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Historico from "./Historico";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const simular = (status: number, corpo: unknown) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status })));

describe("<Historico/>", () => {
  it.each([
    ["pacote_entrou", null, {}, "Pacote entrou na planilha"],
    ["pacote_saiu", null, {}, "Pacote saiu da planilha"],
    ["pacote_voltou", null, {}, "Pacote voltou à planilha"],
    ["nc_entrou", "9001", { situacao: "aberta" }, "NC 9001 entrou como Aberta"],
    ["nc_situacao_mudou", "9001", { antes: "aberta", depois: "concluida" }, "NC 9001 passou de Aberta para Concluída"],
    ["nc_marcada", "9001", {}, "NC 9001 marcada como corrigida"],
    ["nc_desmarcada", "9001", {}, "NC 9001 desmarcada"],
    ["comentario", null, { texto: "massa aplicada" }, "Comentou: massa aplicada"],
    ["resolucao_alterada", null, { antes: "", depois: "refazer" }, "Possível resolução: refazer"],
    ["resolucao_alterada", null, { antes: "refazer", depois: "" }, "Possível resolução apagada"],
    ["pacote_editado", null, { campo: "equipes", antes: "A", depois: "B" }, "Empresa editada: “A” → “B”"],
    ["pacote_editado", null, { campo: "prazo", antes: null, depois: "2026-12-01" }, "Prazo editado: “” → “01/12/2026”"],
    ["nc_editada", "9001", { campo: "descricao", antes: "", depois: "x" }, "NC 9001, descrição editada: “” → “x”"],
    ["resumo_ia_gerado", null, { linhas: 3 }, "Resumo da IA gerado"],
    ["pacote_excluido", null, {}, "Pacote excluído"],
  ])("%s: descrição legível, autor, data e hora", async (tipo, idNc, detalhe, descricao) => {
    simular(200, { eventos: [{ tipo, idNc, detalhe, autor: "Ana", em: "2026-11-20T13:00:00Z" }] });
    render(<Historico codigo="100001" />);
    const item = await screen.findByRole("listitem");
    expect(item.textContent).toContain(descricao);
    expect(item.textContent).toContain("Ana · 20/11/2026 10:00");
  });

  it("recarrega quando o pacote muda, e a resposta antiga que chega depois não vale", async () => {
    const evento = (idNc: string) => new Response(JSON.stringify({ eventos: [{ tipo: "nc_marcada", idNc, detalhe: {}, autor: "Ana", em: "2026-11-20T13:00:00Z" }] }));
    let antiga!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(new Promise((r) => (antiga = r))).mockResolvedValueOnce(evento("9005")));
    const { rerender } = render(<Historico codigo="100001" versao={{}} />);
    rerender(<Historico codigo="100001" versao={{}} />);
    expect(await screen.findByText(/NC 9005/)).toBeTruthy();
    antiga(evento("9001"));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/NC 9001/)).toBeNull();
    expect(screen.getByText(/NC 9005/)).toBeTruthy();
  });

  it("erro aparece como alerta", async () => {
    simular(404, { erro: "Pacote não encontrado." });
    render(<Historico codigo="777" />);
    expect((await screen.findByRole("alert")).textContent).toBe("Pacote não encontrado.");
  });
});
