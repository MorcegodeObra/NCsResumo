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

// Lugares e termos que não dizem qual é o problema; no singular, sem acento.
const VAGOS = new Set(
  (
    "parede sala cozinha quarto banheiro suite varanda sacada hall escada corredor area servico apartamento apto " +
    "pavimento porta janela fachada entrada canto interno interna passa prato lado direito esquerdo entre todo toda alguma algum muito muita varia vario " +
    "fora projeto conforme incompativel incompativei irregular irregulare errado errada ruim problema " +
    "esta estao para pela pelo como deve falta correcao"
  ).split(" "),
);
const simples = (s: string) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const palavras = (s: string) => (simples(s).match(/\b[a-z]{4,}\b/g) ?? []).map((p) => p.replace(/s$/, ""));

/** A descrição diz mais que o item: ao menos 2 palavras (4+ letras) fora do item, dos lugares e dos termos vagos. */
function bemDescrita({ item, descricao }: { item: string; descricao: string }): boolean {
  const doItem = new Set(palavras(item));
  return new Set(palavras(descricao).filter((p) => !doItem.has(p) && !VAGOS.has(p))).size >= 2;
}

type NCLinha = { id: string; item: string; descricao: string; sublocal: string };

function agrupar(ncs: NCLinha[], chave: (n: NCLinha) => string, texto: (n: NCLinha) => string): LinhaCard[] {
  const grupos = new Map<string, NCLinha[]>();
  for (const nc of ncs) {
    const k = chave(nc);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(nc);
  }
  return [...grupos.values()]
    .sort((a, b) => b.length - a.length)
    .map((g) => ({ texto: linhaComLocais(texto(g[0]), g), ncs: g.map((n) => n.id) }));
}

/** Resumo local, sem limite: primeiro as NCs bem descritas, depois uma linha por item; cada parte do maior grupo para o menor. */
export function linhasLocais(ncs: NCLinha[]): LinhaCard[] {
  const item = (n: NCLinha) => semAcento(n.item).toLowerCase();
  return [
    ...agrupar(ncs.filter(bemDescrita), (n) => `${item(n)}|${simples(n.descricao)}`, (n) => n.descricao[0].toUpperCase() + n.descricao.slice(1)),
    ...agrupar(ncs.filter((n) => !bemDescrita(n)), item, (n) => n.item),
  ];
}
