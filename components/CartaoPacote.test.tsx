// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CartaoPacote from "./CartaoPacote";
import { pacoteVisao } from "@/tests/fixtures/visao";

afterEach(cleanup);

describe("<CartaoPacote/>", () => {
  it("faixa ORIGEM | EMPRESA, título bloco · pavimento, serviço, situação e prazo", () => {
    render(<CartaoPacote p={pacoteVisao()} />);
    const card = screen.getByRole("article");
    expect(card.className).toContain("fiscalizacao");
    expect(within(card).getByText("ORIGEM: FISCALIZAÇÃO")).toBeTruthy();
    expect(within(card).getByText("EMPRESA: ALFA")).toBeTruthy();
    expect(within(card).getByRole("heading", { name: "Bloco 1 · 3º PAV." })).toBeTruthy();
    expect(within(card).getByText("Alvenaria")).toBeTruthy();
    expect(within(card).getByText("Aberto")).toBeTruthy();
    expect(within(card).getByText("21/10/2026")).toBeTruthy();
  });

  it("origem FVS mostra QUALIDADE; sem empresa e sem prazo mostra o espaço para preencher", () => {
    render(<CartaoPacote p={pacoteVisao({ origem: "fvs", equipes: "", prazo: null, coluna: "corrigido" })} />);
    expect(screen.getByText("ORIGEM: QUALIDADE")).toBeTruthy();
    expect(screen.getByText("EMPRESA: ________")).toBeTruthy();
    expect(screen.getByText("__/__")).toBeTruthy();
    expect(screen.getByText("Corrigido")).toBeTruthy();
  });

  it("cada linha é um botão expansível com aria-expanded que mostra as NCs dela", () => {
    render(<CartaoPacote p={pacoteVisao()} />);
    const botao = screen.getByRole("button", { name: /Esquadro entre alvenarias \(AP 1-2, HALL A-B\) ×2/ });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/esquadro incompatível/)).toBeNull();
    fireEvent.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    const lista = document.getElementById(botao.getAttribute("aria-controls")!)!;
    expect(within(lista).getByText(/esquadro incompatível/)).toBeTruthy();
    expect(within(lista).getByText(/esquadro de paredes/)).toBeTruthy();
    expect(within(lista).queryByText(/fora de plano/)).toBeNull();
    expect(within(lista).getAllByText(/Serviço: Não atendimento/)).toHaveLength(2);
    fireEvent.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("false");
  });

  it("não limita o número de linhas", () => {
    const linhas = Array.from({ length: 15 }, (_, i) => ({ texto: `Item ${i}`, ncs: [] }));
    render(<CartaoPacote p={pacoteVisao({ linhas })} />);
    expect(screen.getAllByRole("button", { name: /^Item \d+/ })).toHaveLength(15);
  });

  it("pacote que saiu da planilha mostra a data em que saiu", () => {
    render(<CartaoPacote p={pacoteVisao({ coluna: "concluido", saiuEm: "2026-11-20T13:00:00Z", linhas: [], ncs: [] })} />);
    expect(screen.getByText("Concluído")).toBeTruthy();
    expect(screen.getByText(/Saiu da planilha em 20\/11\/2026/)).toBeTruthy();
  });
});
