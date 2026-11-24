// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Importar from "./Importar";
import { COLUNAS, gerarXlsx, LINHAS } from "@/compartilhado/testes/planilha";

afterEach(cleanup);
const arquivo = (buf: ArrayBuffer, nome = "base.xlsx") => new File([buf], nome);
const escolher = (f: File) => fireEvent.change(screen.getByLabelText(/Planilha de inspeções/), { target: { files: [f] } });

describe("<Importar/>", () => {
  it("campo de arquivo com rótulo e accept .xlsx", () => {
    render(<Importar onLido={() => {}} />);
    const input = screen.getByLabelText(/Planilha de inspeções/) as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe(".xlsx");
  });

  it("lê a planilha e entrega a carga (sem enviar o arquivo a lugar nenhum)", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const onLido = vi.fn();
    render(<Importar onLido={onLido} />);
    escolher(arquivo(gerarXlsx()));
    expect(await screen.findByText(/lendo/i)).toBeTruthy();
    await waitFor(() => expect(onLido).toHaveBeenCalled());
    const carga = onLido.mock.calls[0][0];
    expect(carga.pacotes).toHaveLength(2);
    expect(carga.ncs).toHaveLength(14);
    expect(f).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("planilha recusada: mostra a mensagem do contrato e não entrega nada", async () => {
    const onLido = vi.fn();
    render(<Importar onLido={onLido} />);
    escolher(arquivo(gerarXlsx(LINHAS, { colunas: COLUNAS.filter((c) => c !== "Sublocal") })));
    expect((await screen.findByRole("alert")).textContent).toBe('Falta a coluna "Sublocal" na planilha.');
    expect(onLido).not.toHaveBeenCalled();
  });

  it("desabilita o campo enquanto ocupado", () => {
    render(<Importar onLido={() => {}} ocupado />);
    expect((screen.getByLabelText(/Planilha de inspeções/) as HTMLInputElement).disabled).toBe(true);
  });
});
