// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import Pagina from "./page";
import { chamar } from "@/lib/api";

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("página inicial", () => {
  it("sem sessão (GET /api/sessao dá 401): mostra o login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erro: "x" })));
    render(<Pagina />);
    expect(await screen.findByLabelText("Senha")).toBeTruthy();
  });

  it("com sessão: mostra o quadro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { papel: "equipe" })));
    render(<Pagina />);
    expect(await screen.findByTestId("quadro")).toBeTruthy();
    expect(screen.queryByLabelText("Senha")).toBeNull();
  });

  it("com sessão, o Quadro aparece no lugar do placeholder (com a importação)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { papel: "equipe" })));
    render(<Pagina />);
    expect(await screen.findByLabelText(/Planilha de inspeções/)).toBeTruthy();
    expect(screen.queryByText(/Em construção/)).toBeNull();
  });

  it("depois de entrar, troca para o quadro sem recarregar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(resposta(401, { erro: "x" })).mockResolvedValue(resposta(200, { papel: "dono" })),
    );
    render(<Pagina />);
    fireEvent.change(await screen.findByLabelText("Senha"), { target: { value: "abc" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByTestId("quadro")).toBeTruthy();
  });

  it("um 401 em qualquer chamada posterior volta para o login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(resposta(200, { papel: "equipe" })).mockResolvedValue(resposta(401, { erro: "x" })),
    );
    render(<Pagina />);
    await screen.findByTestId("quadro");
    await act(() => chamar("/api/pacotes").catch(() => {}));
    expect(await screen.findByLabelText("Senha")).toBeTruthy();
  });
});
