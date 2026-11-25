// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SessaoTeste } from "@/front/testes/sessao";
import { pacoteVisao } from "@/front/testes/visao";
import Tabela from "./Tabela";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const abrir = (papel: "equipe" | "dono") => {
  const pacotes = [pacoteVisao({ codigo: "100003", coluna: "concluido", concluidoEm: "2026-11-25T15:00:00Z" }), pacoteVisao(), pacoteVisao({ codigo: "100002", coluna: "corrigido" })];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ pacotes }))));
  render(<SessaoTeste papel={papel}><Tabela /></SessaoTeste>);
};

it("dono: contagens e fichas na ordem Aberto, Corrigido, Concluído", async () => {
  abrir("dono");
  expect(await screen.findByText("Aberto: 1 · Corrigido: 1 · Concluído: 1")).toBeTruthy();
  expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/cards/100001", "/cards/100002", "/cards/100003"]);
  expect(screen.getAllByRole("row")[3].textContent).toContain("25/11/2026");
});
it("a equipe não vê a tabela", () => {
  abrir("equipe");
  expect(screen.queryByRole("table")).toBeNull();
});
