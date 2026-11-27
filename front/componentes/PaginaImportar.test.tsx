// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SessaoTeste } from "@/front/testes/sessao";
import { pacoteVisao } from "@/front/testes/visao";

import { gerarXlsx } from "@/compartilhado/testes/planilha";
import PaginaImportar from "./PaginaImportar";

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const contagens = { pacotes: 2, novos: 2, saidos: 0, voltaram: 0, ncs: 14, ncsNovas: 14, ncsMudaram: 0 };
const abrir = (papel: "equipe" | "dono" = "equipe") => render(<SessaoTeste papel={papel}><PaginaImportar /></SessaoTeste>);
const escolher = () =>
  fireEvent.change(screen.getByLabelText(/Planilha de inspeções/), { target: { files: [new File([gerarXlsx()], "b.xlsx")] } });

describe("<PaginaImportar/>", () => {
  it("equipe: manda a carga com o nome, mostra as contagens e não chama a IA", async () => {
    localStorage.setItem("nc-nome", "Maria");
    const f = vi.fn().mockResolvedValue(resposta(200, { contagens }));
    vi.stubGlobal("fetch", f);
    abrir();
    escolher();
    expect(await screen.findByText("Importação gravada.")).toBeTruthy();
    expect(screen.getAllByRole("listitem").slice(-2).map((li) => li.textContent)).toEqual([
      " 2 pacotes2 novos · 0 saíram · 0 voltaram",
      " 14 NCs14 novas · 0 mudaram de situação",
    ]);
    expect(screen.getByRole("link", { name: /Ver o kanban/ }).getAttribute("href")).toBe("/");
    const corpo = JSON.parse(f.mock.calls[0][1].body);
    expect(f.mock.calls[0][0]).toBe("/api/importacoes");
    expect(corpo.autor).toBe("Maria");
    expect(corpo.pacotes).toHaveLength(2);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("dono: depois de gravar, resume os cards com a IA", async () => {
    localStorage.setItem("nc-nome", "Dono");
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { contagens }))
      .mockResolvedValueOnce(resposta(200, { pacotes: [pacoteVisao(), pacoteVisao({ codigo: "100002", resumoIA: true })] }))
      .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao({ resumoIA: true }) }));
    vi.stubGlobal("fetch", f);
    abrir("dono");
    escolher();
    expect(await screen.findByText("1 de 1 pacotes resumidos.")).toBeTruthy();
    expect(f.mock.calls.map((c) => c[0])).toEqual(["/api/importacoes", "/api/pacotes", "/api/pacotes/100001/resumo"]);
  });

  it("falha na IA não esconde que a importação foi gravada", async () => {
    localStorage.setItem("nc-nome", "Dono");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(resposta(200, { contagens })).mockResolvedValue(resposta(500, { erro: "Erro inesperado no servidor." })));
    abrir("dono");
    escolher();
    expect((await screen.findByRole("alert")).textContent).toMatch(/Erro inesperado/);
    expect(screen.getByText(/Importação gravada/)).toBeTruthy();
  });

  it("erro do servidor aparece como alerta", async () => {
    localStorage.setItem("nc-nome", "Maria");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(413, { erro: "A importação passa de 3 MB." })));
    abrir();
    escolher();
    expect((await screen.findByRole("alert")).textContent).toBe("A importação passa de 3 MB.");
  });

  it("sem nome guardado: pede o nome; se a pessoa cancela, nada é enviado", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    vi.stubGlobal("prompt", vi.fn().mockReturnValue(null));
    abrir();
    escolher();
    expect((await screen.findByRole("alert")).textContent).toMatch(/nome/);
    expect(f).not.toHaveBeenCalled();
  });
});
