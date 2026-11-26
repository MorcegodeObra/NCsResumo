// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CartaoPacote from "./CartaoPacote";
import { pacoteVisao } from "@/front/testes/visao";

afterEach(cleanup);

it("mostra o resumo e leva para a ficha, sem nenhuma ação", () => {
  render(<CartaoPacote p={pacoteVisao({ resumoIA: true, resolucao: "refazer" })} />);
  expect(screen.getByRole("heading", { name: "Bloco 1 · 3º PAV." })).toBeTruthy();
  for (const t of ["ORIGEM: FISCALIZAÇÃO", "EMPRESA: ALFA", "Aberto", "21/10/2026", "IA", "refazer"]) expect(screen.getByText(t)).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByRole("link", { name: /Abrir/ }).getAttribute("href")).toBe("/cards/100001");
});

it("sem empresa e sem prazo mostra o espaço para preencher", () => {
  render(<CartaoPacote p={pacoteVisao({ origem: "fvs", equipes: "", prazo: null })} />);
  for (const t of ["ORIGEM: QUALIDADE", "EMPRESA: ________", "__/__"]) expect(screen.getByText(t)).toBeTruthy();
});

it("categoria e urgência em selo; a resolução fica fora do corpo, para aparecer na tela", () => {
  const { container } = render(<CartaoPacote p={pacoteVisao({ categoria: "projeto", urgente: true, resolucao: "trocar o projeto" })} />);
  expect(screen.getByText("Projeto")).toBeTruthy();
  expect(screen.getByText("Urgente")).toBeTruthy();
  const res = container.querySelector(".resolucao")!;
  expect(res.textContent).toContain("trocar o projeto");
  expect(res.closest(".corpo")).toBeNull();
});
