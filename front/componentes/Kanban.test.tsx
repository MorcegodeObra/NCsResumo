// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SessaoTeste } from "@/front/testes/sessao";
import { pacoteVisao } from "@/front/testes/visao";
import Kanban from "./Kanban";

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const pacotes = [
  pacoteVisao(),
  pacoteVisao({ codigo: "100002", bloco: "Bloco 2", pavimento: "TÉRREO", coluna: "corrigido", origem: "fvs" }),
  pacoteVisao({ codigo: "100003", bloco: "Bloco 3", pavimento: "2º PAV.", coluna: "concluido", saiuEm: "2026-11-20T13:00:00Z", linhas: [], ncs: [] }),
];
const abrir = () => render(<SessaoTeste><Kanban /></SessaoTeste>);

describe("<Kanban/>", () => {
  it("carrega GET /api/pacotes e mostra as 3 colunas com título e contagem", async () => {
    const f = vi.fn().mockResolvedValue(resposta(200, { pacotes }));
    vi.stubGlobal("fetch", f);
    abrir();
    const aberto = await screen.findByRole("region", { name: "Aberto (1)" });
    expect(f.mock.calls[0][0]).toBe("/api/pacotes");
    expect(within(aberto).getByRole("heading", { name: "Bloco 1 · 3º PAV." })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Corrigido (1)" })).getByRole("heading", { name: "Bloco 2 · TÉRREO" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Concluído (1)" })).getByRole("heading", { name: "Bloco 3 · 2º PAV." })).toBeTruthy();
  });

  it("o card tem só o local e o serviço, com mover e abrir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes })));
    abrir();
    const card = await screen.findByRole("article", { name: "Pacote 100001" });
    expect(card.textContent).toBe("Bloco 1 · 3º PAV.AlvenariaMover para CorrigidoAbrir card");
    expect(within(card).getByRole("link", { name: /Abrir card/ }).getAttribute("href")).toBe("/cards?q=100001");
    for (const c of ["100002", "100003"])
      expect(within(screen.getByRole("article", { name: `Pacote ${c}` })).queryByRole("button")).toBeNull();
  });

  it("na impressão, o card leva a coluna (Concluído some) e os botões ficam de fora", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes })));
    abrir();
    const card = await screen.findByRole("article", { name: "Pacote 100003" });
    expect(card.classList.contains("concluido")).toBe(true);
    expect(within(card).getByRole("link").closest(".no-print")).toBeTruthy();
  });

  it("sem nome: pede antes de gravar; o erro aparece no card", async () => {
    const f = vi.fn().mockResolvedValue(resposta(200, { pacotes }));
    vi.stubGlobal("fetch", f);
    vi.stubGlobal("prompt", () => null);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Mover para Corrigido" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/nome/);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("sem pacotes, leva para a importação", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes: [] })));
    abrir();
    expect((await screen.findByRole("link", { name: /Importar a planilha/ })).getAttribute("href")).toBe("/importar");
  });

  it("erro ao carregar aparece como alerta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(500, { erro: "Erro inesperado no servidor." })));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Erro inesperado no servidor.");
  });

  it("o pacote devolvido por uma marcação troca de coluna sem recarregar", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { pacotes: [pacoteVisao()] }))
      .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao({ coluna: "corrigido" }) }));
    vi.stubGlobal("fetch", f);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Mover para Corrigido" }));
    expect(await screen.findByRole("region", { name: "Corrigido (1)" })).toBeTruthy();
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ autor: "Ana", ncs: ["9001", "9005"] });
    expect(f).toHaveBeenCalledTimes(2);
  });
});
