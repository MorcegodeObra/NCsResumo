// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Quadro from "./Quadro";
import { gerarXlsx } from "@/tests/fixtures/planilha";
import { pacoteVisao } from "@/tests/fixtures/visao";

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

describe("<Quadro/>", () => {
  it("carrega GET /api/pacotes e mostra as 3 colunas com título e contagem", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes })));
    render(<Quadro papel="equipe" />);
    const aberto = await screen.findByRole("region", { name: "Aberto (1)" });
    expect(within(aberto).getByRole("heading", { name: "Bloco 1 · 3º PAV." })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Corrigido (1)" })).getByRole("heading", { name: "Bloco 2 · TÉRREO" })).toBeTruthy();
    const concluido = screen.getByRole("region", { name: "Concluído (1)" });
    expect(within(concluido).getByText(/Saiu da planilha em 20\/11\/2026/)).toBeTruthy();
  });

  it("importar: manda a carga com o nome guardado, mostra as contagens e recarrega", async () => {
    localStorage.setItem("nc-nome", "Maria");
    const contagens = { pacotes: 2, novos: 2, saidos: 0, voltaram: 0, ncs: 14, ncsNovas: 14, ncsMudaram: 0 };
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { pacotes: [] }))
      .mockResolvedValueOnce(resposta(200, { contagens }))
      .mockResolvedValueOnce(resposta(200, { pacotes }));
    vi.stubGlobal("fetch", f);
    render(<Quadro papel="equipe" />);
    await screen.findByRole("region", { name: "Aberto (0)" });
    fireEvent.change(screen.getByLabelText(/Planilha de inspeções/), { target: { files: [new File([gerarXlsx()], "b.xlsx")] } });
    expect(await screen.findByText(/2 pacotes \(2 novos, 0 saíram, 0 voltaram\), 14 NCs \(14 novas, 0 mudaram de situação\)/)).toBeTruthy();
    await screen.findByRole("region", { name: "Aberto (1)" });
    const [url, init] = f.mock.calls[1];
    expect(url).toBe("/api/importacoes");
    const corpo = JSON.parse(init.body);
    expect(corpo.autor).toBe("Maria");
    expect(corpo.pacotes).toHaveLength(2);
    expect(f.mock.calls[2][0]).toBe("/api/pacotes");
  });

  it("erro do servidor na importação aparece como alerta", async () => {
    localStorage.setItem("nc-nome", "Maria");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(resposta(200, { pacotes: [] })).mockResolvedValueOnce(resposta(413, { erro: "A importação passa de 3 MB." })),
    );
    render(<Quadro papel="equipe" />);
    await screen.findByRole("region", { name: "Aberto (0)" });
    fireEvent.change(screen.getByLabelText(/Planilha de inspeções/), { target: { files: [new File([gerarXlsx()], "b.xlsx")] } });
    expect((await screen.findByRole("alert")).textContent).toBe("A importação passa de 3 MB.");
  });

  it("importar sem nome guardado: pede o nome; se a pessoa cancela, nada é enviado", async () => {
    const f = vi.fn().mockResolvedValue(resposta(200, { pacotes: [] }));
    vi.stubGlobal("fetch", f);
    vi.stubGlobal("prompt", vi.fn().mockReturnValue(null));
    render(<Quadro papel="equipe" />);
    await screen.findByRole("region", { name: "Aberto (0)" });
    fireEvent.change(screen.getByLabelText(/Planilha de inspeções/), { target: { files: [new File([gerarXlsx()], "b.xlsx")] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/nome/);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("o pacote devolvido por uma marcação troca de coluna sem recarregar o quadro", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { pacotes: [pacoteVisao()] }))
      .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao({ coluna: "corrigido" }) }));
    vi.stubGlobal("fetch", f);
    render(<Quadro papel="equipe" />);
    fireEvent.click(await screen.findByRole("button", { name: "Mover para Corrigido" }));
    expect(await screen.findByRole("region", { name: "Corrigido (1)" })).toBeTruthy();
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("equipe não vê Resumir todos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes })));
    render(<Quadro papel="equipe" />);
    await screen.findByRole("region", { name: "Aberto (1)" });
    expect(screen.queryByRole("button", { name: "Resumir todos" })).toBeNull();
  });

  it("dono: Resumir todos chama um pacote por vez, pula Concluído e quem já tem resumo, e conta as falhas", async () => {
    const lista = [
      pacoteVisao(),
      pacoteVisao({ codigo: "100002", coluna: "corrigido" }),
      pacoteVisao({ codigo: "100003", resumoIA: true }),
      pacoteVisao({ codigo: "100004", coluna: "concluido", saiuEm: "2026-11-20T13:00:00Z" }),
    ];
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { pacotes: lista }))
      .mockResolvedValueOnce(resposta(200, { pacote: pacoteVisao({ resumoIA: true }) }))
      .mockResolvedValueOnce(resposta(200, { pacote: lista[1], aviso: "falhou" }));
    vi.stubGlobal("fetch", f);
    render(<Quadro papel="dono" />);
    fireEvent.click(await screen.findByRole("button", { name: "Resumir todos" }));
    expect(await screen.findByText("1 de 2 pacotes resumidos; 1 ficou com o resumo local.")).toBeTruthy();
    expect(f.mock.calls.slice(1).map((c) => c[0])).toEqual(["/api/pacotes/100001/resumo", "/api/pacotes/100002/resumo"]);
  });

  it("dono: excluir tira o card do quadro", async () => {
    vi.stubGlobal("confirm", () => true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(resposta(200, { pacotes: [pacoteVisao()] })).mockResolvedValueOnce(resposta(200, { ok: true })),
    );
    render(<Quadro papel="dono" />);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("region", { name: "Aberto (0)" })).toBeTruthy();
  });
});
