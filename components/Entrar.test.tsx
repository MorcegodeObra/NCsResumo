// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Entrar from "./Entrar";

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("<Entrar/>", () => {
  it("tem campos de senha e nome com rótulo", () => {
    render(<Entrar onEntrou={() => {}} />);
    expect(screen.getByLabelText("Senha")).toHaveProperty("type", "password");
    expect(screen.getByLabelText("Seu nome")).toHaveProperty("type", "text");
  });

  it("senha certa: guarda o nome e avisa o papel", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { papel: "equipe" })));
    const onEntrou = vi.fn();
    render(<Entrar onEntrou={onEntrou} />);
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "abc" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: " Maria " } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(onEntrou).toHaveBeenCalledWith("equipe"));
    expect(localStorage.getItem("nc-nome")).toBe("Maria");
  });

  it("senha errada: mostra a mensagem do servidor e não entra", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erro: "Senha incorreta." })));
    const onEntrou = vi.fn();
    render(<Entrar onEntrou={onEntrou} />);
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Maria" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Senha incorreta.");
    expect(onEntrou).not.toHaveBeenCalled();
  });

  it("pede o nome antes de entrar", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    render(<Entrar onEntrou={() => {}} />);
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/nome/i);
    expect(f).not.toHaveBeenCalled();
  });

  it("já preenche o nome guardado", () => {
    localStorage.setItem("nc-nome", "João");
    render(<Entrar onEntrou={() => {}} />);
    expect(screen.getByLabelText("Seu nome")).toHaveProperty("value", "João");
  });
});
