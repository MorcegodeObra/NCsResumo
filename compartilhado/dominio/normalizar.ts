// Normalização dos valores da planilha (contracts/planilha.md, "Normalização" e "Formatação para o card").
import type { Origem } from "./tipos";

export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Junta espaços, apara e trata "." como vazio. */
export function texto(v: unknown): string {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return s === "." ? "" : s;
}

function partesData(v: unknown) {
  const m = texto(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [d, mes, ano, h = 0, min = 0, seg = 0] = m.slice(1).map((x) => (x === undefined ? undefined : Number(x))) as number[];
  const dt = new Date(Date.UTC(ano, mes - 1, d, h, min, seg));
  if (dt.getUTCDate() !== d || dt.getUTCMonth() !== mes - 1 || h > 23 || min > 59 || seg > 59) return null;
  return dt.toISOString().slice(0, 19);
}

/** "21/10/2026 00:00:00" → "2026-10-21"; inválido → null. */
export const data = (v: unknown): string | null => partesData(v)?.slice(0, 10) ?? null;

/** "23/10/2026 11:01:29" → "2026-10-23T11:01:29"; inválido → null. */
export const dataHora = (v: unknown): string | null => partesData(v);

export const origem = (descricaoFvs: unknown): Origem =>
  semAcento(texto(descricaoFvs)).toUpperCase().includes("FISCALIZACAO") ? "fiscalizacao" : "fvs";

export const situacaoItem = (v: unknown) => texto(v).toUpperCase();

const tiraCodigo = (s: string) => s.replace(/^\d+\s*-\s*/, "");

/** "4828 - SERVIÇO DE EXECUÇÃO DE ALVENARIA - 15CM …" → "Alvenaria". */
export function servico(v: unknown): string {
  const s = tiraCodigo(texto(v))
    .replace(/^SERVI[CÇ]O\s+(DE\s+)?(EXECU[CÇ][AÃ]O\s+DE\s+)?/i, "")
    .split(/\s+-\s+|\s*\(/)[0]
    .trim()
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "3 º Pavimento - 3" → "3º PAV."; "PAVIMENTO TÉRREO - 1" → "TÉRREO". */
export function pavimento(v: unknown): string {
  const s = texto(v);
  if (/t[eé]rreo/i.test(s)) return "TÉRREO";
  const m = s.match(/(\d+)\s*[º°]\s*Pav/i);
  return m ? `${m[1]}º PAV.` : s;
}

/** Valores de Equipe(s) de várias linhas → "FORCE ONE / NO PRUMO". Não corrige erros de digitação. */
export function empresa(valores: unknown[]): string {
  const nomes: string[] = [];
  for (const v of valores)
    for (const parte of texto(v).split(",")) {
      const n = tiraCodigo(parte.trim()).trim().toUpperCase();
      if (n && !nomes.includes(n)) nomes.push(n);
    }
  return nomes.join(" / ");
}

export const item = (v: unknown) => tiraCodigo(texto(v));

/** "BL 6 - 3° PAV - AP 01 95%" → "AP 1"; "hall b" → "HALL B"; "." → "". */
export function sublocal(v: unknown): string {
  const pontas = (s: string) => s.replace(/^[.\s]+|[.\s]+$/g, "");
  let s = pontas(texto(v));
  s = s.replace(/[-_\s]*\d+\s*%/g, "").replace(/^[\s\-_]+|[\s\-_]+$/g, "");
  s = s.replace(/^(BL|BLOCO)\s*\d+\s*-\s*(\d+\s*[°º]\s*PAV|T[eé]rreo)\s*-\s*/i, "");
  s = pontas(s);
  const ap = s.match(/^(?:AP|APTO|APARTAMENTO)\.?\s*0*(\d+)$/i);
  if (ap) return `AP ${Number(ap[1])}`;
  const hall = s.match(/^HALL\.?\s*([A-Z])$/i);
  if (hall) return `HALL ${hall[1].toUpperCase()}`;
  return s.toUpperCase();
}
