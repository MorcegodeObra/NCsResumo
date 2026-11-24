// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SessaoTeste } from "@/front/testes/sessao";
import { pacoteVisao } from "@/front/testes/visao";
import Cards from "./Cards";

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const pacotes = [pacoteVisao(), pacoteVisao({ codigo: "100002", bloco: "Bloco 2", pavimento: "TÉRREO", tarefa: "Reboco", origem: "fvs" })];
const abrir = (papel: "equipe" | "dono" = "equipe", busca = "") => render(<SessaoTeste papel={papel}><Cards busca={busca} /></SessaoTeste>);
const cards = () => screen.queryAllByRole("article").map((a) => a.getAttribute("aria-label"));

describe("<Cards/>", () => {
  it("lista os cards e busca por código, local, serviço ou problema, sem acento nem caixa", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes })));
    abrir();
    const campo = await screen.findByLabelText(/Buscar/);
    expect(cards()).toHaveLength(2);
    for (const q of ["100002", "terreo", "REBOCO"]) {
      fireEvent.change(campo, { target: { value: q } });
      expect(cards()).toEqual(["Pacote 100002"]);
    }
    fireEvent.change(campo, { target: { value: "nada disso" } });
    expect(screen.getByText(/Nenhum card/)).toBeTruthy();
  });

  it("começa com a busca que veio do link do kanban", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes })));
    abrir("equipe", "100001");
    await screen.findByRole("article");
    expect(cards()).toEqual(["Pacote 100001"]);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeTruthy();
  });

  it("exporta só o que está na busca", async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText: escrever } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes })));
    abrir("equipe", "100002");
    fireEvent.click(await screen.findByRole("button", { name: "Copiar texto" }));
    await screen.findByText("Texto copiado.");
    expect(escrever.mock.calls[0][0]).toContain("Bloco 2");
    expect(escrever.mock.calls[0][0]).not.toContain("Bloco 1");
    expect(screen.queryByRole("button", { name: "Resumir todos" })).toBeNull();
  });

  it("dono: Resumir todos usa a fila e troca os cards", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { pacotes: [pacoteVisao()] }))
      .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao({ resumoIA: true }) }));
    vi.stubGlobal("fetch", f);
    abrir("dono");
    fireEvent.click(await screen.findByRole("button", { name: "Resumir todos" }));
    expect(await screen.findByText("1 de 1 pacotes resumidos.")).toBeTruthy();
    expect(screen.getByText("IA")).toBeTruthy();
  });

  it("dono: excluir tira o card", async () => {
    vi.stubGlobal("confirm", () => true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(resposta(200, { pacotes: [pacoteVisao()] })).mockResolvedValueOnce(resposta(200, { ok: true })));
    abrir("dono");
    fireEvent.click(await screen.findByRole("button", { name: "Abrir" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/Nenhum card/)).toBeTruthy();
    expect(within(document.body).queryByRole("article")).toBeNull();
  });
});
