// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CartaoPacote from "./CartaoPacote";
import { pacoteVisao } from "@/front/testes/visao";

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
const simularFetch = (status: number, corpo: unknown) => {
  const f = vi.fn().mockResolvedValue(resposta(status, corpo));
  vi.stubGlobal("fetch", f);
  return f;
};
const corpoDe = (f: ReturnType<typeof vi.fn>) => JSON.parse(f.mock.calls[0][1].body);
const expandir = () => fireEvent.click(screen.getByRole("button", { name: /^Esquadro/ }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("<CartaoPacote/>", () => {
  it("faixa ORIGEM | EMPRESA, título bloco · pavimento, serviço, situação e prazo", () => {
    render(<CartaoPacote p={pacoteVisao()} abertoInicial />);
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
    render(<CartaoPacote p={pacoteVisao({ origem: "fvs", equipes: "", prazo: null, coluna: "corrigido" })} abertoInicial />);
    expect(screen.getByText("ORIGEM: QUALIDADE")).toBeTruthy();
    expect(screen.getByText("EMPRESA: ________")).toBeTruthy();
    expect(screen.getByText("__/__")).toBeTruthy();
    expect(screen.getByText("Corrigido")).toBeTruthy();
  });

  it("cada linha é um botão expansível com aria-expanded que mostra as NCs dela", () => {
    render(<CartaoPacote p={pacoteVisao()} abertoInicial />);
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
    render(<CartaoPacote p={pacoteVisao({ linhas })} abertoInicial />);
    expect(screen.getAllByRole("button", { name: /^Item \d+/ })).toHaveLength(15);
  });

  it("pacote que saiu da planilha mostra a data em que saiu", () => {
    render(<CartaoPacote p={pacoteVisao({ coluna: "concluido", saiuEm: "2026-11-20T13:00:00Z", linhas: [], ncs: [] })} abertoInicial />);
    expect(screen.getByText("Concluído")).toBeTruthy();
    expect(screen.getByText(/Saiu da planilha em 20\/11\/2026/)).toBeTruthy();
  });
});

describe("<CartaoPacote/> — ações da equipe", () => {
  it("cada NC tem um checkbox com rótulo; marcar envia o nome e devolve o pacote novo", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const novo = pacoteVisao({ coluna: "corrigido" });
    const f = simularFetch(200, { pacote: novo });
    const onMudou = vi.fn();
    render(<CartaoPacote p={pacoteVisao()} abertoInicial onMudou={onMudou} />);
    expandir();
    const caixa = screen.getByRole("checkbox", { name: /esquadro incompatível/ }) as HTMLInputElement;
    expect(caixa.checked).toBe(false);
    fireEvent.click(caixa);
    await vi.waitFor(() => expect(onMudou).toHaveBeenCalledWith(novo));
    expect(f.mock.calls[0].slice(0, 1)).toEqual(["/api/pacotes/100001/marcacoes"]);
    expect(f.mock.calls[0][1].method).toBe("POST");
    expect(corpoDe(f)).toEqual({ autor: "Ana", ncs: ["9001"] });
  });

  it("NC marcada mostra quem marcou e desmarcar usa DELETE", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const f = simularFetch(200, { pacote: pacoteVisao() });
    render(<CartaoPacote p={pacoteVisao()} abertoInicial />);
    expandir();
    expect(screen.getByText(/corrigida por Maria/)).toBeTruthy();
    const caixa = screen.getByRole("checkbox", { name: /esquadro de paredes/ }) as HTMLInputElement;
    expect(caixa.checked).toBe(true);
    fireEvent.click(caixa);
    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(f.mock.calls[0][1].method).toBe("DELETE");
  });

  it("corrigida pela planilha (sem marcação) não pode ser desmarcada", () => {
    const p = pacoteVisao();
    p.ncs[1] = { ...p.ncs[1], marcadaPor: null };
    render(<CartaoPacote p={p} abertoInicial />);
    expandir();
    expect((screen.getByRole("checkbox", { name: /esquadro de paredes/ }) as HTMLInputElement).disabled).toBe(true);
  });

  it("Mover para Corrigido marca todas as abertas visíveis", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const f = simularFetch(200, { pacote: pacoteVisao() });
    render(<CartaoPacote p={pacoteVisao()} abertoInicial />);
    fireEvent.click(screen.getByRole("button", { name: "Mover para Corrigido" }));
    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(corpoDe(f)).toEqual({ autor: "Ana", ncs: ["9001", "9005"] });
    cleanup();
    render(<CartaoPacote p={pacoteVisao({ coluna: "corrigido" })} abertoInicial />);
    expect(screen.queryByRole("button", { name: "Mover para Corrigido" })).toBeNull();
  });

  it("sem nome guardado: pede o nome antes de gravar e guarda", async () => {
    const f = simularFetch(200, { pacote: pacoteVisao() });
    const perguntar = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce(" Ana ");
    vi.stubGlobal("prompt", perguntar);
    render(<CartaoPacote p={pacoteVisao()} abertoInicial />);
    const mover = screen.getByRole("button", { name: "Mover para Corrigido" });
    fireEvent.click(mover);
    expect((await screen.findByRole("alert")).textContent).toMatch(/nome/);
    expect(f).not.toHaveBeenCalled();
    fireEvent.click(mover);
    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(corpoDe(f).autor).toBe("Ana");
    expect(localStorage.getItem("nc-nome")).toBe("Ana");
  });

  it("abre o histórico a partir do card", async () => {
    simularFetch(200, { eventos: [{ tipo: "pacote_entrou", idNc: null, detalhe: {}, autor: "importação", em: "2026-11-20T13:00:00Z" }] });
    render(<CartaoPacote p={pacoteVisao()} abertoInicial />);
    const botao = screen.getByRole("button", { name: "Histórico" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(botao);
    expect(await screen.findByText(/Pacote entrou na planilha/)).toBeTruthy();
    expect(botao.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("<CartaoPacote/> — ações do dono", () => {
  it("a equipe não vê os botões do dono; o selo IA aparece para todos", () => {
    render(<CartaoPacote p={pacoteVisao({ resumoIA: true })} abertoInicial />);
    expect(screen.queryByRole("button", { name: "Resumir com IA" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Excluir" })).toBeNull();
    expect(screen.getByText("IA")).toBeTruthy();
    cleanup();
    render(<CartaoPacote p={pacoteVisao()} abertoInicial />);
    expect(screen.queryByText("IA")).toBeNull();
  });

  it("Resumir com IA: troca o pacote e mostra o aviso quando a IA falha", async () => {
    const novo = pacoteVisao();
    const f = simularFetch(200, { pacote: novo, aviso: "A IA não está configurada." });
    const onMudou = vi.fn();
    render(<CartaoPacote p={pacoteVisao()} papel="dono" abertoInicial onMudou={onMudou} />);
    fireEvent.click(screen.getByRole("button", { name: "Resumir com IA" }));
    expect((await screen.findByRole("alert")).textContent).toBe("A IA não está configurada.");
    expect(onMudou).toHaveBeenCalledWith(novo);
    expect(f.mock.calls[0][0]).toBe("/api/pacotes/100001/resumo");
  });

  it("pacote sem NC visível não tem o que resumir", () => {
    render(<CartaoPacote p={pacoteVisao({ coluna: "concluido", linhas: [], ncs: [] })} papel="dono" abertoInicial />);
    expect(screen.queryByRole("button", { name: "Resumir com IA" })).toBeNull();
  });

  it("Excluir pede confirmação antes", async () => {
    const f = simularFetch(200, { ok: true });
    const onExcluido = vi.fn();
    const confirmar = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirmar);
    render(<CartaoPacote p={pacoteVisao()} papel="dono" abertoInicial onExcluido={onExcluido} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(f).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await vi.waitFor(() => expect(onExcluido).toHaveBeenCalledWith("100001"));
    expect(f.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("<CartaoPacote/> — fechado e aberto", () => {
  it("fechado: conteúdo sem controles além de Abrir; Abrir mostra as ações e Fechar esconde", () => {
    render(<CartaoPacote p={pacoteVisao()} papel="dono" />);
    const card = screen.getByRole("article");
    expect(card.className).toContain("fechado");
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Abrir"]);
    expect(screen.getByText(/^Planicidade/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(card.className).not.toContain("fechado");
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
    const fechar = screen.getByRole("button", { name: "Fechar" });
    expect(fechar.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(fechar);
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("fechar não perde a resolução que o dono estava escrevendo", () => {
    render(<CartaoPacote p={pacoteVisao()} papel="dono" abertoInicial />);
    fireEvent.change(screen.getByLabelText("Possível resolução"), { target: { value: "rascunho" } });
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect((screen.getByLabelText("Possível resolução") as HTMLTextAreaElement).value).toBe("rascunho");
  });

  it("a equipe lê a resolução, mas não escreve", () => {
    render(<CartaoPacote p={pacoteVisao({ resolucao: "refazer" })} abertoInicial />);
    expect(screen.getByText("refazer")).toBeTruthy();
    expect(screen.queryByLabelText("Possível resolução")).toBeNull();
  });

  it("o dono escreve a resolução sem precisar informar o nome", async () => {
    const novo = pacoteVisao({ resolucao: "demolir" });
    const f = simularFetch(200, { pacote: novo });
    const onMudou = vi.fn();
    render(<CartaoPacote p={pacoteVisao({ resolucao: "refazer" })} papel="dono" abertoInicial onMudou={onMudou} />);
    const campo = screen.getByLabelText("Possível resolução") as HTMLTextAreaElement;
    expect(campo.value).toBe("refazer");
    fireEvent.change(campo, { target: { value: "demolir" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar resolução" }));
    await vi.waitFor(() => expect(onMudou).toHaveBeenCalledWith(novo));
    expect(f.mock.calls[0][0]).toBe("/api/pacotes/100001/resolucao");
    expect(corpoDe(f)).toEqual({ texto: "demolir" });
    expect(await screen.findByText("Resolução salva.")).toBeTruthy();
  });

  it("erro ao salvar aparece como alerta e o texto não se perde", async () => {
    simularFetch(404, { erro: "Pacote não encontrado." });
    render(<CartaoPacote p={pacoteVisao()} papel="dono" abertoInicial />);
    const campo = screen.getByLabelText("Possível resolução") as HTMLTextAreaElement;
    fireEvent.change(campo, { target: { value: "demolir" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar resolução" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Pacote não encontrado.");
    expect(campo.value).toBe("demolir");
  });
});

describe("<CartaoPacote/> — edição", () => {
  it("a equipe edita com o nome; salvar fecha o formulário e troca o pacote", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const novo = pacoteVisao({ equipes: "BETA" });
    const f = simularFetch(200, { pacote: novo });
    const onMudou = vi.fn();
    render(<CartaoPacote p={pacoteVisao()} abertoInicial onMudou={onMudou} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "BETA" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar edição" }));
    await vi.waitFor(() => expect(onMudou).toHaveBeenCalledWith(novo));
    expect(f.mock.calls[0][0]).toBe("/api/pacotes/100001/ajustes");
    expect(corpoDe(f)).toEqual({ autor: "Ana", pacote: { equipes: "BETA" }, ncs: [] });
    await vi.waitFor(() => expect(screen.queryByLabelText("Empresa")).toBeNull());
  });

  it("erro ao salvar mantém o formulário com o que foi digitado", async () => {
    localStorage.setItem("nc-nome", "Ana");
    simularFetch(400, { erro: "Data inválida em prazo." });
    render(<CartaoPacote p={pacoteVisao()} abertoInicial />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "BETA" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar edição" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Data inválida em prazo.");
    expect((screen.getByLabelText("Empresa") as HTMLInputElement).value).toBe("BETA");
  });
});
