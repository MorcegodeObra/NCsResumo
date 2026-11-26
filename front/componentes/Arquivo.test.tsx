// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SessaoTeste } from "@/front/testes/sessao";
import { pacoteVisao } from "@/front/testes/visao";
import Arquivo from "./Arquivo";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const EM = "2026-11-26T10:00:00Z";
const solta = { ...pacoteVisao().ncs[0], id: "9009", descricao: "não vai ser feita", arquivadaEm: EM };
const abrir = (papel: "equipe" | "dono") => {
  const pacotes = [pacoteVisao({ codigo: "100003", arquivadoEm: EM }), pacoteVisao({ arquivadas: [solta] }), pacoteVisao({ codigo: "100002" })];
  const f = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ pacotes, pacote: pacotes[0] })));
  vi.stubGlobal("fetch", f);
  render(<SessaoTeste papel={papel}><Arquivo /></SessaoTeste>);
  return f;
};

it("dono: cards arquivados e NCs arquivadas soltas, cada um com Desarquivar", async () => {
  const f = abrir("dono");
  expect(await screen.findByRole("heading", { name: "Cards arquivados (1)" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "NCs arquivadas (1)" })).toBeTruthy();
  expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/cards/100003", "/cards/100001"]);
  expect(screen.getByText(/não vai ser feita/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Desarquivar card 100003" }));
  await vi.waitFor(() => expect(f.mock.calls[1]).toMatchObject(["/api/pacotes/100003/arquivo", { method: "DELETE" }]));
});

it("a equipe não vê o arquivo", () => {
  abrir("equipe");
  expect(screen.getByText("Só o dono vê esta página.")).toBeTruthy();
});
