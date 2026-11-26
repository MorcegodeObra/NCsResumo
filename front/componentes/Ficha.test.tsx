// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Ficha from "./Ficha";
import { pacoteVisao } from "@/front/testes/visao";

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
const EVENTOS = [{ tipo: "pacote_entrou", idNc: null, detalhe: {}, autor: "importação", em: "2026-11-20T13:00:00Z" }];
const simularFetch = (status: number, corpo: unknown) => {
  const f = vi.fn().mockResolvedValue(resposta(status, corpo));
  // O histórico carrega sozinho e não conta como ação.
  vi.stubGlobal("fetch", (url: string, init: unknown) => (url.endsWith("/historico") ? Promise.resolve(resposta(200, { eventos: EVENTOS })) : f(url, init)));
  return f;
};
const corpoDe = (f: ReturnType<typeof vi.fn>) => JSON.parse(f.mock.calls[0][1].body);
beforeEach(() => void simularFetch(200, {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("<Ficha/>", () => {
  it("faixa ORIGEM | EMPRESA, título bloco · pavimento, serviço, situação e prazo", () => {
    render(<Ficha p={pacoteVisao()} />);
    const card = screen.getByRole("article");
    expect(card.className).toContain("fiscalizacao");
    expect(within(card).getByText("FISCALIZAÇÃO")).toBeTruthy();
    expect(within(card).getByText("ALFA")).toBeTruthy();
    expect(within(card).getByRole("heading", { name: "Bloco 1 · 3º PAV." })).toBeTruthy();
    expect(within(card).getByText("Alvenaria")).toBeTruthy();
    expect(within(card).getByText("Aberto")).toBeTruthy();
    expect(within(card).getByText("21/10/2026")).toBeTruthy();
  });

  it("origem FVS mostra QUALIDADE; sem empresa e sem prazo mostra um traço", () => {
    render(<Ficha p={pacoteVisao({ origem: "fvs", equipes: "", prazo: null, coluna: "corrigido" })} />);
    expect(screen.getByText("QUALIDADE")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("Corrigido")).toBeTruthy();
  });

  it("mostra todas as NCs, agrupadas pelas linhas do resumo", () => {
    render(<Ficha p={pacoteVisao()} />);
    expect(screen.getByRole("heading", { name: /Esquadro entre alvenarias \(AP 1-2, HALL A-B\) ×2/ })).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByText(/fora de plano/)).toBeTruthy();
  });

  it("pacote que saiu da planilha mostra a data em que saiu", () => {
    render(<Ficha p={pacoteVisao({ coluna: "concluido", saiuEm: "2026-11-20T13:00:00Z", linhas: [], ncs: [] })} />);
    expect(screen.getByText("Concluído")).toBeTruthy();
    expect(screen.getByText("20/11/2026")).toBeTruthy();
  });
});

describe("<Ficha/> — ações da equipe", () => {
  it("cada NC tem um checkbox com rótulo; marcar envia o nome e devolve o pacote novo", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const novo = pacoteVisao({ coluna: "corrigido" });
    const f = simularFetch(200, { pacote: novo });
    const onMudou = vi.fn();
    render(<Ficha p={pacoteVisao()} onMudou={onMudou} />);
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
    render(<Ficha p={pacoteVisao()} />);
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
    render(<Ficha p={p} />);
    expect((screen.getByRole("checkbox", { name: /esquadro de paredes/ }) as HTMLInputElement).disabled).toBe(true);
  });

  it("Mover para Corrigido marca todas as abertas visíveis", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const f = simularFetch(200, { pacote: pacoteVisao() });
    render(<Ficha p={pacoteVisao()} />);
    fireEvent.click(screen.getByRole("button", { name: "Mover para Corrigido" }));
    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(corpoDe(f)).toEqual({ autor: "Ana", ncs: ["9001", "9005"] });
    cleanup();
    render(<Ficha p={pacoteVisao({ coluna: "corrigido" })} />);
    expect(screen.queryByRole("button", { name: "Mover para Corrigido" })).toBeNull();
  });

  it("sem nome guardado: pede o nome antes de gravar e guarda", async () => {
    const f = simularFetch(200, { pacote: pacoteVisao() });
    const perguntar = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce(" Ana ");
    vi.stubGlobal("prompt", perguntar);
    render(<Ficha p={pacoteVisao()} />);
    const mover = screen.getByRole("button", { name: "Mover para Corrigido" });
    fireEvent.click(mover);
    expect((await screen.findByRole("alert")).textContent).toMatch(/nome/);
    expect(f).not.toHaveBeenCalled();
    fireEvent.click(mover);
    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(corpoDe(f).autor).toBe("Ana");
    expect(localStorage.getItem("nc-nome")).toBe("Ana");
  });

  it("mostra o histórico", async () => {
    render(<Ficha p={pacoteVisao()} />);
    expect(await screen.findByText(/Pacote entrou na planilha/)).toBeTruthy();
  });

  it("a equipe não conclui", () => {
    render(<Ficha p={pacoteVisao({ coluna: "corrigido" })} />);
    expect(screen.queryByRole("button", { name: /Mover|Voltar/ })).toBeNull();
  });
});

describe("<Ficha/> — ações do dono", () => {
  it("a equipe não vê os botões do dono; o selo IA aparece para todos", () => {
    render(<Ficha p={pacoteVisao({ resumoIA: true })} />);
    expect(screen.queryByRole("button", { name: "Resumir com IA" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Excluir" })).toBeNull();
    expect(screen.getByText("IA")).toBeTruthy();
    cleanup();
    render(<Ficha p={pacoteVisao()} />);
    expect(screen.queryByText("IA")).toBeNull();
  });

  it("Resumir com IA: troca o pacote e mostra o aviso quando a IA falha", async () => {
    const novo = pacoteVisao();
    const f = simularFetch(200, { pacote: novo, aviso: "A IA não está configurada." });
    const onMudou = vi.fn();
    render(<Ficha p={pacoteVisao()} papel="dono" onMudou={onMudou} />);
    fireEvent.click(screen.getByRole("button", { name: "Resumir com IA" }));
    expect((await screen.findByRole("alert")).textContent).toBe("A IA não está configurada.");
    expect(onMudou).toHaveBeenCalledWith(novo);
    expect(f.mock.calls[0][0]).toBe("/api/pacotes/100001/resumo");
  });

  it("conclui o corrigido e desfaz a própria conclusão; a da planilha não", async () => {
    const f = simularFetch(200, { pacote: pacoteVisao() });
    render(<Ficha p={pacoteVisao({ coluna: "corrigido" })} papel="dono" />);
    fireEvent.click(screen.getByRole("button", { name: "Mover para Concluído" }));
    await vi.waitFor(() => expect(f.mock.calls[0]).toMatchObject(["/api/pacotes/100001/conclusao", { method: "POST" }]));
    cleanup();
    render(<Ficha p={pacoteVisao({ coluna: "concluido", concluidoEm: "2026-11-25T15:00:00Z" })} papel="dono" />);
    expect(screen.getByRole("button", { name: "Voltar para Corrigido" })).toBeTruthy();
    expect((screen.getAllByRole("checkbox") as HTMLInputElement[]).every((c) => c.disabled)).toBe(true);
    cleanup();
    render(<Ficha p={pacoteVisao({ coluna: "concluido", saiuEm: "2026-11-20T13:00:00Z" })} papel="dono" />);
    expect(screen.queryByRole("button", { name: /Voltar/ })).toBeNull();
  });

  it("pacote sem NC visível não tem o que resumir", () => {
    render(<Ficha p={pacoteVisao({ coluna: "concluido", linhas: [], ncs: [] })} papel="dono" />);
    expect(screen.queryByRole("button", { name: "Resumir com IA" })).toBeNull();
  });

  it("Excluir pede confirmação antes", async () => {
    const f = simularFetch(200, { ok: true });
    const onExcluido = vi.fn();
    const confirmar = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirmar);
    render(<Ficha p={pacoteVisao()} papel="dono" onExcluido={onExcluido} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(f).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await vi.waitFor(() => expect(onExcluido).toHaveBeenCalledWith("100001"));
    expect(f.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("<Ficha/> — resolução", () => {
  it("a equipe lê a resolução, mas não escreve", () => {
    render(<Ficha p={pacoteVisao({ resolucao: "refazer" })} />);
    expect(screen.getByText("refazer")).toBeTruthy();
    expect(screen.queryByLabelText("Texto da possível resolução")).toBeNull();
  });

  it("o dono escreve a resolução sem precisar informar o nome", async () => {
    const novo = pacoteVisao({ resolucao: "demolir" });
    const f = simularFetch(200, { pacote: novo });
    const onMudou = vi.fn();
    render(<Ficha p={pacoteVisao({ resolucao: "refazer" })} papel="dono" onMudou={onMudou} />);
    const campo = screen.getByLabelText("Texto da possível resolução") as HTMLTextAreaElement;
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
    render(<Ficha p={pacoteVisao()} papel="dono" />);
    const campo = screen.getByLabelText("Texto da possível resolução") as HTMLTextAreaElement;
    fireEvent.change(campo, { target: { value: "demolir" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar resolução" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Pacote não encontrado.");
    expect(campo.value).toBe("demolir");
  });
});

describe("<Ficha/> — edição", () => {
  it("a equipe edita com o nome; salvar fecha o formulário e troca o pacote", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const novo = pacoteVisao({ equipes: "BETA" });
    const f = simularFetch(200, { pacote: novo });
    const onMudou = vi.fn();
    render(<Ficha p={pacoteVisao()} onMudou={onMudou} />);
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
    render(<Ficha p={pacoteVisao()} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "BETA" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar edição" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Data inválida em prazo.");
    expect((screen.getByLabelText("Empresa") as HTMLInputElement).value).toBe("BETA");
  });
});

describe("<Ficha/> — arquivo (specs/005)", () => {
  const solta = { ...pacoteVisao().ncs[0], id: "9009", descricao: "não vai ser feita", arquivadaEm: "2026-11-26T10:00:00Z" };

  it("a equipe não arquiva", () => {
    render(<Ficha p={pacoteVisao({ arquivadas: [solta] })} />);
    expect(screen.queryByRole("button", { name: /rquivar/ })).toBeNull();
    expect(screen.queryByText(/não vai ser feita/)).toBeNull();
  });

  it("o dono arquiva o card e cada NC", async () => {
    const f = simularFetch(200, { pacote: pacoteVisao() });
    const onMudou = vi.fn();
    render(<Ficha p={pacoteVisao()} papel="dono" onMudou={onMudou} />);
    expect(screen.getAllByRole("button", { name: /^Arquivar NC/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Arquivar card" }));
    await vi.waitFor(() => expect(f.mock.calls[0]).toMatchObject(["/api/pacotes/100001/arquivo", { method: "POST" }]));
    await vi.waitFor(() => expect(onMudou).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole("button", { name: /^Arquivar NC/ })[0]);
    await vi.waitFor(() => expect(f.mock.calls[1]).toMatchObject(["/api/pacotes/100001/ncs/9001/arquivo", { method: "POST" }]));
  });

  it("card arquivado: data, Desarquivar card e as NCs arquivadas com Desarquivar", async () => {
    const f = simularFetch(200, { pacote: pacoteVisao() });
    render(<Ficha p={pacoteVisao({ arquivadoEm: "2026-11-26T10:00:00Z", arquivadas: [solta] })} papel="dono" />);
    expect(screen.getByText("Arquivado em")).toBeTruthy();
    expect(screen.getByText(/não vai ser feita/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Desarquivar NC/ }));
    await vi.waitFor(() => expect(f.mock.calls[0]).toMatchObject(["/api/pacotes/100001/ncs/9009/arquivo", { method: "DELETE" }]));
    await vi.waitFor(() => expect(screen.getByRole("article").getAttribute("aria-busy")).toBe("false"));
    fireEvent.click(screen.getByRole("button", { name: "Desarquivar card" }));
    await vi.waitFor(() => expect(f.mock.calls[1]).toMatchObject(["/api/pacotes/100001/arquivo", { method: "DELETE" }]));
  });
});

describe("<Ficha/> — urgência (specs/005)", () => {
  it("o selo aparece para todos; só o dono marca e tira", async () => {
    render(<Ficha p={pacoteVisao({ urgente: true })} />);
    expect(screen.getByText("Urgente")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /urgên|urgente/ })).toBeNull();
    cleanup();
    const f = simularFetch(200, { pacote: pacoteVisao() });
    render(<Ficha p={pacoteVisao()} papel="dono" />);
    fireEvent.click(screen.getByRole("button", { name: "Marcar urgente" }));
    await vi.waitFor(() => expect(f.mock.calls[0]).toMatchObject(["/api/pacotes/100001/urgencia", { method: "PUT" }]));
    expect(corpoDe(f)).toEqual({ urgente: true });
  });

  it("card concluído não pode ser marcado", () => {
    render(<Ficha p={pacoteVisao({ coluna: "concluido" })} papel="dono" />);
    expect(screen.queryByRole("button", { name: "Marcar urgente" })).toBeNull();
  });
});

describe("<Ficha/> — categoria (specs/006)", () => {
  it("a equipe liga Recorrente com o nome e desliga; o selo aparece", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const f = simularFetch(200, { pacote: pacoteVisao({ categoria: "recorrente" }) });
    render(<Ficha p={pacoteVisao()} />);
    fireEvent.click(screen.getByRole("button", { name: "Recorrente" }));
    await vi.waitFor(() => expect(f.mock.calls[0]).toMatchObject(["/api/pacotes/100001/categoria", { method: "PUT" }]));
    expect(corpoDe(f)).toEqual({ autor: "Ana", categoria: "recorrente" });
    cleanup();
    render(<Ficha p={pacoteVisao({ categoria: "projeto" })} />);
    expect(screen.getByText("Projeto", { selector: ".situacao" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Projeto" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("card concluído não recebe categoria", () => {
    render(<Ficha p={pacoteVisao({ coluna: "concluido" })} papel="dono" />);
    expect(screen.queryByRole("button", { name: "Recorrente" })).toBeNull();
  });
});
