import type { Cartao, Documento, NCComLocal, Origem } from "./types";

export const NOME_ORIGEM: Record<Origem, string> = {
  fvs: "QUALIDADE",
  fiscalizacao: "FISCALIZAÇÃO",
};

function paraData(s: string): number {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return Infinity;
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return new Date(ano, Number(m[2]) - 1, Number(m[1])).getTime();
}

export function menorPrazo(prazos: string[]): string {
  let melhor = "";
  let t = Infinity;
  for (const p of prazos) {
    const v = paraData(p);
    if (v < t) {
      t = v;
      melhor = p;
    }
  }
  return melhor;
}

const PALAVRAS: Record<string, string> = {
  construcoes: "Construções", construcao: "Construção", instalacoes: "Instalações", instalacao: "Instalação",
  servicos: "Serviços", eletrica: "Elétrica", eletricas: "Elétricas", hidraulica: "Hidráulica",
  hidraulicas: "Hidráulicas", comercio: "Comércio", industria: "Indústria", incorporacoes: "Incorporações",
  fundacoes: "Fundações", pavimentacao: "Pavimentação", manutencao: "Manutenção", reformas: "Reformas",
};
const SUFIXOS = new Set(["ltda", "ltda.", "s/a", "sa", "s.a.", "me", "epp", "eireli", "mei"]);
const LIGACOES = new Set(["da", "de", "do", "das", "dos", "e"]);

/** "12.345.678/0001-34 - EJL CONSTRUCOES LTDA" -> "Ejl Construções"; "00.406 - PAULO X" -> "Paulo X" */
export function limparNome(s: string): string {
  const palavras = s.replace(/^[\d.\/\s-]+/, "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  while (palavras.length > 1 && SUFIXOS.has(palavras[palavras.length - 1])) palavras.pop();
  return palavras
    .map((w, i) => PALAVRAS[w] ?? (i > 0 && LIGACOES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function maisFrequentes(valores: string[], max = 2): string {
  const cont = new Map<string, number>();
  for (const v of valores.filter(Boolean)) cont.set(v, (cont.get(v) || 0) + 1);
  const ordenado = [...cont.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  if (ordenado.length <= max) return ordenado.join(" / ");
  return `${ordenado.slice(0, max).join(" / ")} +${ordenado.length - max}`;
}

const semAc = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** "AP 01", "AP 02", "HALL A" -> "AP 1-2, HALL A" */
export function juntarLocais(locais: string[]): string {
  const aps = new Set<number>();
  const outros = new Set<string>();
  for (const l of locais.filter(Boolean)) {
    const m = l.match(/^AP\s*0*(\d+)$/i);
    if (m) aps.add(Number(m[1]));
    else outros.add(l);
  }
  const partes: string[] = [];
  if (aps.size) partes.push("AP " + [...aps].sort((a, b) => a - b).join("-"));
  partes.push(...outros);
  return partes.join(", ");
}

export const MAX_LINHA = 48;
export const corta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** Garante no máximo 3 linhas curtas (o card tem altura fixa). */
export const limitarLinhas = (linhas: string[]): string[] => linhas.slice(0, 3).map((l) => corta(l, MAX_LINHA));

/** Resumo sem IA: agrupa por item de inspeção, com os locais; no máximo 3 linhas. */
export function linhasSemIA(ncs: NCComLocal[]): string[] {
  const grupos = new Map<string, { item: string; descs: string[]; locais: string[] }>();
  for (const nc of ncs) {
    const item = nc.item || nc.descricao || "NC";
    const k = semAc(item);
    if (!grupos.has(k)) grupos.set(k, { item, descs: [], locais: [] });
    const g = grupos.get(k)!;
    if (nc.descricao) g.descs.push(nc.descricao);
    if (nc.local) g.locais.push(nc.local);
  }
  const frase = (g: { item: string; descs: string[]; locais: string[] }) => {
    const cont = new Map<string, number>();
    for (const d of g.descs) cont.set(d, (cont.get(d) || 0) + 1);
    const desc = [...cont.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const primeira = semAc(g.item).split(/[\s(]/)[0];
    const texto = !desc ? g.item : semAc(desc).includes(primeira) ? desc : `${g.item}: ${desc}`;
    const locais = juntarLocais(g.locais);
    const qtd = Math.max(g.descs.length, g.locais.length);
    if (locais) return `${corta(texto, MAX_LINHA)} (${locais})`;
    return qtd > 1 ? `${corta(texto, MAX_LINHA)} ×${qtd}` : corta(texto, MAX_LINHA);
  };
  const lista = [...grupos.values()].sort((a, b) => b.locais.length + b.descs.length - (a.locais.length + a.descs.length));
  if (lista.length <= 3) return lista.map(frase);
  const resto = lista.slice(2).map((g) => {
    const q = Math.max(g.descs.length, g.locais.length);
    return q > 1 ? `${g.item} ×${q}` : g.item;
  });
  let outros = "Outros: ";
  let usados = 0;
  for (const r of resto) {
    if ((outros + r).length > MAX_LINHA - 6 && usados > 0) break;
    outros += (usados ? ", " : "") + r;
    usados++;
  }
  if (usados < resto.length) outros += ` +${resto.length - usados}`;
  return [...lista.slice(0, 2).map(frase), corta(outros, MAX_LINHA)];
}

const ehAlvenaria = (d: Documento) => /alvenaria/i.test(`${d.servico ?? ""} ${d.codigo ?? ""}`);

/**
 * Alvenaria: um cartão por apartamento (ou por ficha, se a ficha não traz o apartamento).
 * Outros serviços: um cartão só por origem + serviço + bloco + pavimento.
 */
export function agruparEmCartoes(docs: Documento[]): Cartao[] {
  const grupos = new Map<string, { sub: string; docs: Documento[] }>();
  const fichasSemApt = new Map<string, number>();
  for (const d of docs) {
    if (d.status !== "ok" || !d.origem || d.ncs.length === 0) continue;
    const base = [d.origem, d.codigo || d.servico, d.bloco, d.pavimento].join("|");
    let sub = "";
    if (ehAlvenaria(d)) {
      if (d.sublocal) sub = d.sublocal;
      else {
        const n = (fichasSemApt.get(base) || 0) + 1;
        fichasSemApt.set(base, n);
        sub = `ficha ${n}`;
      }
    }
    const chave = sub ? `${base}|${sub}` : base;
    if (!grupos.has(chave)) grupos.set(chave, { sub, docs: [] });
    grupos.get(chave)!.docs.push(d);
  }
  const cartoes: Cartao[] = [];
  for (const [chave, { sub, docs: lista }] of grupos) {
    const d0 = lista[0];
    const ncs: NCComLocal[] = lista.flatMap((d) =>
      d.ncs.map((nc) => ({ ...nc, local: sub ? "" : d.sublocal || "" }))
    );
    const bloco = d0.bloco || "";
    const pav = d0.pavimento || "";
    const semApto = sub.startsWith("ficha ");
    const titulo = [bloco, pav, semApto ? "" : sub].filter(Boolean).join(" · ") || "Local não identificado";
    cartoes.push({
      chave,
      origem: d0.origem!,
      empresa: maisFrequentes(lista.map((d) => d.equipe || ""), 2),
      bloco,
      pavimento: pav,
      servico: d0.servico || d0.codigo || "Serviço",
      codigo: d0.codigo || "",
      titulo,
      linhas: [],
      prazo: menorPrazo(ncs.map((n) => n.prazo)),
      responsavel: maisFrequentes(lista.map((d) => d.equipe || ""), 2), // equipe da ficha
      qtdNCs: ncs.length,
      arquivos: lista.map((d) => d.arquivo),
      ncs,
      precisaApto: semApto,
    });
  }
  const num = (s: string) => Number(s.match(/\d+/)?.[0] ?? 0);
  return cartoes.sort(
    (a, b) => num(a.bloco) - num(b.bloco) || a.titulo.localeCompare(b.titulo, "pt-BR", { numeric: true })
  );
}

/** Com a opção ligada, some a FVS de um serviço que já tem ficha de fiscalização. */
export function aplicarRegraFiscalizacao(cartoes: Cartao[]): Cartao[] {
  const chaveServico = (c: Cartao) => [c.codigo || c.servico, c.bloco, c.pavimento].join("|");
  const comFiscal = new Set(cartoes.filter((c) => c.origem === "fiscalizacao").map(chaveServico));
  return cartoes.filter((c) => c.origem === "fiscalizacao" || !comFiscal.has(chaveServico(c)));
}
