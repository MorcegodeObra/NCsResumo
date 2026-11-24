// Agrupamento das NCs nas linhas do card (data-model.md, "Linhas do card").
import { semAcento } from "./normalizar";
import type { LinhaCard, Origem } from "./tipos";

export const NOME_ORIGEM: Record<Origem, string> = { fvs: "QUALIDADE", fiscalizacao: "FISCALIZAÇÃO" };

/** "AP 1", "AP 3", "HALL B", "AP 2", "HALL A" → "AP 1-2-3, HALL A-B". */
export function juntarLocais(locais: string[]): string {
  const aps = new Set<number>();
  const halls = new Set<string>();
  const outros: string[] = [];
  for (const l of locais) {
    if (!l) continue;
    const ap = l.match(/^AP (\d+)$/);
    const hall = l.match(/^HALL ([A-Z])$/);
    if (ap) aps.add(Number(ap[1]));
    else if (hall) halls.add(hall[1]);
    else if (!outros.includes(l)) outros.push(l);
  }
  const partes: string[] = [];
  if (aps.size) partes.push("AP " + [...aps].sort((a, b) => a - b).join("-"));
  if (halls.size) partes.push("HALL " + [...halls].sort().join("-"));
  return [...partes, ...outros].join(", ");
}

/** Menor data ISO (aaaa-mm-dd), ignorando nulos. */
export function menorPrazo(prazos: (string | null)[]): string | null {
  const validos = prazos.filter((p): p is string => !!p).sort();
  return validos[0] ?? null;
}

/** "texto (locais) ×n": os locais e a contagem são sempre calculados aqui, nunca pela IA. */
export function linhaComLocais(texto: string, ncs: { sublocal: string }[]): string {
  const locais = juntarLocais(ncs.map((n) => n.sublocal));
  return `${texto}${locais ? ` (${locais})` : ""}${ncs.length > 1 ? ` ×${ncs.length}` : ""}`;
}

/** Resumo local: uma linha por item de inspeção, do maior grupo para o menor, sem limite. */
export function linhasLocais(ncs: { id: string; item: string; sublocal: string }[]): LinhaCard[] {
  const grupos = new Map<string, { item: string; ncs: typeof ncs }>();
  for (const nc of ncs) {
    const k = semAcento(nc.item).toLowerCase();
    if (!grupos.has(k)) grupos.set(k, { item: nc.item, ncs: [] });
    grupos.get(k)!.ncs.push(nc);
  }
  return [...grupos.values()]
    .sort((a, b) => b.ncs.length - a.ncs.length)
    .map((g) => ({ texto: linhaComLocais(g.item, g.ncs), ncs: g.ncs.map((n) => n.id) }));
}
