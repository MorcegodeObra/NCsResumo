// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Editar from "./Editar";
import { pacoteVisao } from "@/front/testes/visao";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const valor = (nome: string) => (screen.getByLabelText(nome) as HTMLInputElement).value;

describe("<Editar/>", () => {
  it("começa com o que está no card, com rótulo em todos os campos", () => {
    render(<Editar p={pacoteVisao()} onSalvar={() => {}} onCancelar={() => {}} />);
    expect(["Empresa", "Serviço", "Bloco", "Pavimento", "Prazo"].map(valor)).toEqual(["ALFA", "Alvenaria", "Bloco 1", "3º PAV.", "2026-10-21"]);
    expect(valor("Descrição da NC 9001")).toBe("esquadro incompatível");
    expect(valor("Local da NC 9001")).toBe("AP 1");
  });

  it("manda só o que mudou", () => {
    const onSalvar = vi.fn();
    render(<Editar p={pacoteVisao()} onSalvar={onSalvar} onCancelar={() => {}} />);
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "BETA" } });
    fireEvent.change(screen.getByLabelText("Local da NC 9005"), { target: { value: "AP 9" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar edição" }));
    expect(onSalvar).toHaveBeenCalledWith({ pacote: { equipes: "BETA" }, ncs: [{ id: "9005", sublocal: "AP 9" }] });
  });

  it("sem mudança, ou em Cancelar, só fecha", () => {
    const onSalvar = vi.fn();
    const onCancelar = vi.fn();
    render(<Editar p={pacoteVisao()} onSalvar={onSalvar} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar edição" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancelar).toHaveBeenCalledTimes(2);
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
