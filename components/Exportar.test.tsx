// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Exportar from "./Exportar";
import { pacotesParaCSV, pacotesParaTexto } from "@/lib/exportar";
import { pacoteVisao } from "@/tests/fixtures/visao";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const pacotes = [pacoteVisao()];
const clicar = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const areaDeTransferencia = (writeText: () => Promise<void>) => vi.stubGlobal("navigator", { clipboard: { writeText } });

describe("<Exportar/>", () => {
  it("Copiar texto", async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    areaDeTransferencia(escrever);
    render(<Exportar pacotes={pacotes} />);
    clicar("Copiar texto");
    expect(await screen.findByText("Texto copiado.")).toBeTruthy();
    expect(escrever).toHaveBeenCalledWith(pacotesParaTexto(pacotes));
  });

  it("falha ao copiar aparece como alerta", async () => {
    areaDeTransferencia(vi.fn().mockRejectedValue(new Error("negado")));
    render(<Exportar pacotes={pacotes} />);
    clicar("Copiar texto");
    expect((await screen.findByRole("alert")).textContent).toMatch(/copiar/);
  });

  it("Baixar CSV", async () => {
    const criar = vi.fn((_: Blob) => "blob:x");
    URL.createObjectURL = criar as never;
    URL.revokeObjectURL = vi.fn();
    const baixado = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("ncs.csv");
    });
    render(<Exportar pacotes={pacotes} />);
    clicar("Baixar CSV");
    expect(baixado).toHaveBeenCalledOnce();
    // A BOM conta 3 bytes, então o tamanho confere o conteúdo inteiro.
    expect(criar.mock.calls[0][0].size).toBe(Buffer.byteLength(pacotesParaCSV(pacotes)));
  });

  it("Imprimir", () => {
    const imprimir = vi.fn();
    vi.stubGlobal("print", imprimir);
    render(<Exportar pacotes={pacotes} />);
    clicar("Imprimir");
    expect(imprimir).toHaveBeenCalledOnce();
  });
});
