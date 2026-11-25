// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import Moldura, { usePapel } from "./Moldura";
import { chamar } from "@/front/lib/api";

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
const Conteudo = () => <p>conteúdo do {usePapel()}</p>;
const abrir = () => render(<Moldura><Conteudo /></Moldura>);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("<Moldura/>", () => {
  it("sem sessão: só o login, sem menu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erro: "x" })));
    abrir();
    expect(await screen.findByLabelText("Senha")).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByText(/conteúdo/)).toBeNull();
  });

  it("com sessão: menu, nome, papel e o conteúdo da página", async () => {
    localStorage.setItem("nc-nome", "Ana");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { papel: "dono" })));
    abrir();
    expect(await screen.findByText("conteúdo do dono")).toBeTruthy();
    expect(screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([["Kanban", "/"], ["Cards", "/cards"], ["Tabela", "/tabela"], ["Importar", "/importar"]]);
    expect(screen.getByText("Ana · Dono")).toBeTruthy();
  });

  it("depois de entrar, mostra o conteúdo sem recarregar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(resposta(401, { erro: "x" })).mockResolvedValueOnce(resposta(200, { papel: "equipe" })));
    abrir();
    fireEvent.change(await screen.findByLabelText("Senha"), { target: { value: "abc" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("conteúdo do equipe")).toBeTruthy();
    expect(screen.getByText("Ana · Equipe")).toBeTruthy();
  });

  it("Sair apaga a sessão e o nome e volta para o login", async () => {
    localStorage.setItem("nc-nome", "Ana");
    const f = vi.fn().mockResolvedValueOnce(resposta(200, { papel: "equipe" })).mockResolvedValueOnce(resposta(200, { ok: true }));
    vi.stubGlobal("fetch", f);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));
    expect(await screen.findByLabelText("Senha")).toBeTruthy();
    expect(f.mock.calls[1][0]).toBe("/api/sessao");
    expect(f.mock.calls[1][1].method).toBe("DELETE");
    expect(localStorage.getItem("nc-nome")).toBeNull();
  });

  it("se sair falhar, avisa e continua na página", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(resposta(200, { papel: "equipe" })).mockRejectedValue(new Error("rede")));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/sair/);
    expect(screen.getByText("conteúdo do equipe")).toBeTruthy();
  });

  it("um 401 em qualquer chamada posterior volta para o login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(resposta(200, { papel: "equipe" })).mockResolvedValue(resposta(401, { erro: "x" })));
    abrir();
    await screen.findByText(/conteúdo/);
    await act(() => chamar("/api/pacotes").catch(() => {}));
    expect(await screen.findByLabelText("Senha")).toBeTruthy();
  });
});
