// Lê o .xlsx no navegador (o arquivo nunca sai daqui) e valida o contrato de entrada.
import * as XLSX from "xlsx";
import { ABA, COLUNAS_OBRIGATORIAS } from "./colunas";

export type LinhaPlanilha = Record<string, string>;

export class ErroPlanilha extends Error {}

export function lerPlanilha(arquivo: ArrayBuffer): LinhaPlanilha[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(arquivo, { type: "array", dense: true });
  } catch {
    throw new ErroPlanilha("O arquivo não é uma planilha .xlsx.");
  }
  const ws = wb.Sheets[ABA];
  if (!ws) throw new ErroPlanilha(`A planilha não tem a aba "${ABA}".`);

  const linhas = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "", blankrows: false });
  const iCab = linhas.findIndex((l) => l.some((c) => String(c).trim() === "Código Pacote"));
  if (iCab < 0) throw new ErroPlanilha(`A aba "${ABA}" não tem a linha de cabeçalho (com "Código Pacote").`);

  const cabecalho = linhas[iCab].map((c) => String(c).trim());
  const faltam = COLUNAS_OBRIGATORIAS.filter((c) => !cabecalho.includes(c));
  if (faltam.length === 1) throw new ErroPlanilha(`Falta a coluna "${faltam[0]}" na planilha.`);
  if (faltam.length > 1) throw new ErroPlanilha(`Faltam as colunas ${faltam.map((c) => `"${c}"`).join(", ")} na planilha.`);

  const indice = COLUNAS_OBRIGATORIAS.map((c) => [c, cabecalho.indexOf(c)] as const);
  const iCodigo = cabecalho.indexOf("Código Pacote");
  return linhas
    .slice(iCab + 1)
    .filter((l) => /^\d+$/.test(String(l[iCodigo] ?? "").trim())) // descarta vazias e o rodapé
    .map((l) => Object.fromEntries(indice.map(([c, i]) => [c, String(l[i] ?? "")])));
}
