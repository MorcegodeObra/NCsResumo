// Datas para exibição, no fuso da obra.
const FUSO = "America/Sao_Paulo";

export function dataBR(v: string | null): string {
  if (!v) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.exec(v) ? v.split("-").reverse().join("/") : null;
  return d ?? new Date(v).toLocaleDateString("pt-BR", { timeZone: FUSO });
}

export const dataHoraBR = (v: string) =>
  new Date(v).toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "");
