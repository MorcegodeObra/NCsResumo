import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { COLUNAS, gerarXlsx, LINHAS } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "./ler";

// Contrato: contracts/planilha.md, "Arquivo" e "Linhas".
describe("lerPlanilha", () => {
  it("acha o cabeçalho na linha 2 e devolve as linhas indexadas pelo nome da coluna", () => {
    const linhas = lerPlanilha(gerarXlsx());
    expect(linhas[0]["Código Pacote"]).toBe("100001");
    expect(linhas[0]["Descrição Item Inspeção"]).toBe("364 - Esquadro entre alvenarias");
  });

  it("descarta linhas vazias e o rodapé (Código Pacote não numérico)", () => {
    const linhas = lerPlanilha(gerarXlsx());
    expect(linhas).toHaveLength(LINHAS.length - 1);
    expect(linhas.every((l) => /^\d+$/.test(l["Código Pacote"]))).toBe(true);
  });

  it("aceita as colunas em qualquer ordem e ignora colunas a mais", () => {
    const colunas = ["Coluna Extra", ...[...COLUNAS].reverse()];
    const linhas = lerPlanilha(gerarXlsx(LINHAS, { colunas }));
    expect(linhas[0]["Código Pacote"]).toBe("100001");
    expect(linhas[0]["Sublocal"]).toBe("BL 1 - 3° PAV - AP 01 95%");
  });

  it("apara espaços no nome das colunas do cabeçalho", () => {
    const colunas = COLUNAS.map((c) => (c === "Sublocal" ? " Sublocal " : c));
    const linhas = LINHAS.map((l) => ({ ...l, " Sublocal ": l.Sublocal }) as typeof l);
    expect(lerPlanilha(gerarXlsx(linhas, { colunas }))[0]["Sublocal"]).toBe("BL 1 - 3° PAV - AP 01 95%");
  });

  it("recusa a planilha sem a aba, com a mensagem do contrato", () => {
    expect(() => lerPlanilha(gerarXlsx(LINHAS, { aba: "Planilha1" }))).toThrow(
      'A planilha não tem a aba "Base de Dados de Inspeções".',
    );
  });

  it("recusa com o nome da coluna que falta", () => {
    const colunas = COLUNAS.filter((c) => c !== "Sublocal");
    expect(() => lerPlanilha(gerarXlsx(LINHAS, { colunas }))).toThrow('Falta a coluna "Sublocal" na planilha.');
  });

  it("lista todas as colunas que faltam", () => {
    const colunas = COLUNAS.filter((c) => c !== "Sublocal" && c !== "Equipe(s)");
    expect(() => lerPlanilha(gerarXlsx(LINHAS, { colunas }))).toThrow(
      'Faltam as colunas "Sublocal", "Equipe(s)" na planilha.',
    );
  });

  it("recusa a aba sem linha de cabeçalho", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["a", "b"], ["1", "2"]]), "Base de Dados de Inspeções");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    expect(() => lerPlanilha(buf)).toThrow('não tem a linha de cabeçalho (com "Código Pacote")');
  });

  it("recusa um arquivo que não é planilha", () => {
    const buf = new TextEncoder().encode("isto não é uma planilha").buffer;
    expect(() => lerPlanilha(buf)).toThrow(/aba "Base de Dados de Inspeções"|não é uma planilha/);
  });
});
