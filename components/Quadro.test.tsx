// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Quadro from "./Quadro";
import { gerarXlsx } from "@/tests/fixtures/planilha";

afterEach(cleanup);

describe("<Quadro/> (US1: cards calculados no aparelho)", () => {
  it("depois de importar, mostra um card por pacote nas colunas do kanban", async () => {
    render(<Quadro papel="equipe" />);
    fireEvent.change(screen.getByLabelText(/Planilha de inspeções/), { target: { files: [new File([gerarXlsx()], "b.xlsx")] } });
    const cards = await screen.findAllByRole("article");
    expect(cards).toHaveLength(2);
    const aberto = screen.getByRole("region", { name: /Aberto/ });
    expect(within(aberto).getByRole("heading", { name: "Bloco 1 · 3º PAV." })).toBeTruthy();
    expect(within(aberto).getByRole("heading", { name: "Bloco 2 · TÉRREO" })).toBeTruthy();
    expect(screen.getByRole("region", { name: /Corrigido/ })).toBeTruthy();
    expect(screen.getByRole("region", { name: /Concluído/ })).toBeTruthy();
  });
});
