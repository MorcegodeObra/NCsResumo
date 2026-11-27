// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SessaoTeste } from "@/front/testes/sessao";
import { pacoteVisao } from "@/front/testes/visao";
import PaginaFicha from "./PaginaFicha";

const router = { back: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  history.replaceState(null, "");
});

describe("<PaginaFicha/> Voltar (R7)", () => {
  it("volta para a tela de onde veio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes: [pacoteVisao()] })));
    history.pushState(null, "", "/cards/100001"); // como o Next faz ao abrir pelo kanban
    render(<SessaoTeste><PaginaFicha codigo="100001" /></SessaoTeste>);
    fireEvent.click(await screen.findByRole("button", { name: /Voltar/ }));
    expect(router.back).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("aberta direto pelo endereço, vai para o kanban", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { pacotes: [pacoteVisao()] })));
    vi.spyOn(history, "length", "get").mockReturnValue(1);
    render(<SessaoTeste><PaginaFicha codigo="100001" /></SessaoTeste>);
    fireEvent.click(await screen.findByRole("button", { name: /Voltar/ }));
    expect(router.push).toHaveBeenCalledWith("/");
  });
});
