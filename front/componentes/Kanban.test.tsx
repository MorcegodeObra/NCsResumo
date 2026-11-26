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
const abrir = (papel: "equipe" | "dono" = "dono") => render(<SessaoTeste papel={papel}><Kanban /></SessaoTeste>);

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
    expect(card.textContent).toBe("Bloco 1 · 3º PAV.AlvenariaMover para Corrigido");
    expect(within(card).getByRole("link").getAttribute("href")).toBe("/cards/100001");
    expect(within(screen.getByRole("article", { name: "Pacote 100002" })).getByRole("button", { name: "Mover para Concluído" })).toBeTruthy();
    expect(within(screen.getByRole("article", { name: "Pacote 100003" })).queryByRole("button")).toBeNull();
  });

  it("a equipe não vê Concluído nem pode concluir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes: pacotes.slice(0, 2) })));
    abrir("equipe");
    await screen.findByRole("region", { name: "Corrigido (1)" });
    expect(screen.queryByRole("region", { name: /Concluído/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mover para Concluído" })).toBeNull();
  });

  it("arrastar para a coluna certa move; para outra, não", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { pacotes }))
      .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao({ codigo: "100002", coluna: "concluido" }) }));
    vi.stubGlobal("fetch", f);
    abrir();
    const card = await screen.findByRole("article", { name: "Pacote 100002" });
    const pegar = () => fireEvent.dragStart(card, { dataTransfer: { setData() {} } });
    pegar();
    fireEvent.drop(screen.getByRole("region", { name: /Aberto/ }));
    expect(f).toHaveBeenCalledTimes(1);
    pegar();
    fireEvent.drop(screen.getByRole("region", { name: /Concluído/ }));
    expect(await screen.findByRole("region", { name: "Concluído (2)" })).toBeTruthy();
    expect(f.mock.calls[1]).toMatchObject(["/api/pacotes/100002/conclusao", { method: "POST" }]);
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

  describe("kanban fixo, urgência e busca (specs/005)", () => {
    const muitos = Array.from({ length: 25 }, (_, i) =>
      pacoteVisao({ codigo: String(200000 + i), bloco: `Bloco ${i + 1}`, recenteEm: `2026-11-${String(i + 1).padStart(2, "0")}T10:00:00Z` }),
    );
    const cards = (col: RegExp) => within(screen.getByRole("region", { name: col })).queryAllByRole("article").map((a) => a.getAttribute("aria-label"));

    it("mostra 10 por coluna, os mais recentes primeiro, com o total; Ver mais traz mais 10", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes: muitos })));
      abrir();
      await screen.findByRole("region", { name: "Aberto (25)" });
      expect(cards(/Aberto/)).toHaveLength(10);
      expect(cards(/Aberto/)[0]).toBe("Pacote 200024");
      fireEvent.click(screen.getByRole("button", { name: /Ver mais \(15\)/ }));
      expect(cards(/Aberto/)).toHaveLength(20);
      fireEvent.click(screen.getByRole("button", { name: /Ver mais \(5\)/ }));
      expect(cards(/Aberto/)).toHaveLength(25);
      expect(screen.queryByRole("button", { name: /Ver mais/ })).toBeNull();
    });

    it("urgente vai para o topo e tem selo para a equipe, sem o botão", async () => {
      const lista = [...muitos.slice(0, 24), pacoteVisao({ codigo: "300000", urgente: true, recenteEm: null })];
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes: lista })));
      abrir("equipe");
      await screen.findByRole("region", { name: "Aberto (25)" });
      expect(cards(/Aberto/)[0]).toBe("Pacote 300000");
      expect(within(screen.getByRole("article", { name: "Pacote 300000" })).getByText("Urgente")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /urgência|urgente/ })).toBeNull();
    });

    it("o dono marca a urgência pelo card", async () => {
      const f = vi
        .fn()
        .mockResolvedValueOnce(resposta(200, { pacotes }))
        .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao({ urgente: true }) }));
      vi.stubGlobal("fetch", f);
      abrir();
      const card = await screen.findByRole("article", { name: "Pacote 100001" });
      fireEvent.click(within(card).getByRole("button", { name: "Marcar como urgente" }));
      expect(await screen.findByText("Urgente")).toBeTruthy();
      expect(f.mock.calls[1]).toMatchObject(["/api/pacotes/100001/urgencia", { method: "PUT" }]);
    });

    it("a busca acha um card escondido pelo corte; arquivados não aparecem", async () => {
      const lista = [...muitos, pacoteVisao({ codigo: "400000", bloco: "Bloco 99", arquivadoEm: "2026-11-26T10:00:00Z" })];
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes: lista })));
      abrir();
      await screen.findByRole("region", { name: "Aberto (25)" });
      fireEvent.change(screen.getByRole("searchbox", { name: "Buscar no kanban" }), { target: { value: "bloco 1" } });
      expect(cards(/Aberto/)).toEqual(["Pacote 200000"]);
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bloco 99" } });
      expect(cards(/Aberto/)).toEqual([]);
    });

    it("abas escolhem a coluna do celular", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes })));
      abrir();
      const aba = await screen.findByRole("button", { name: /^Corrigido/ });
      expect(screen.getByRole("region", { name: /Aberto/ }).className).toContain("ativa");
      fireEvent.click(aba);
      expect(aba.getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("region", { name: /Corrigido/ }).className).toContain("ativa");
    });
  });

  describe("Recorrentes e Projetos (specs/006)", () => {
    const arrastar = async (codigo: string, para: RegExp) => {
      fireEvent.dragStart(await screen.findByRole("article", { name: `Pacote ${codigo}` }), { dataTransfer: { setData() {} } });
      fireEvent.drop(screen.getByRole("region", { name: para }));
    };

    it("card com categoria fica na coluna dela, com o selo da situação", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes: [pacoteVisao({ categoria: "recorrente" }), pacotes[1]] })));
      abrir("equipe");
      const rec = await screen.findByRole("region", { name: "Recorrentes (1)" });
      expect(within(rec).getByText("Aberto")).toBeTruthy();
      expect(screen.getByRole("region", { name: "Aberto (0)" })).toBeTruthy();
      expect(screen.getByRole("region", { name: "Projetos (0)" })).toBeTruthy();
    });

    it("arrastar para Recorrentes dá a categoria, com o nome; de volta para Aberto, tira", async () => {
      localStorage.setItem("nc-nome", "Ana");
      const f = vi
        .fn()
        .mockResolvedValueOnce(resposta(200, { pacotes: [pacoteVisao()] }))
        .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao({ categoria: "recorrente" }) }))
        .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao() }));
      vi.stubGlobal("fetch", f);
      abrir("equipe");
      await arrastar("100001", /^Recorrentes/);
      expect(await screen.findByRole("region", { name: "Recorrentes (1)" })).toBeTruthy();
      expect(f.mock.calls[1]).toMatchObject(["/api/pacotes/100001/categoria", { method: "PUT" }]);
      expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ autor: "Ana", categoria: "recorrente" });
      await arrastar("100001", /^Corrigido/); // a situação só muda pela marcação
      expect(f).toHaveBeenCalledTimes(2);
      await arrastar("100001", /^Aberto/);
      expect(await screen.findByRole("region", { name: "Aberto (1)" })).toBeTruthy();
      expect(JSON.parse(f.mock.calls[2][1].body)).toEqual({ autor: "Ana", categoria: null });
    });
  });
});
