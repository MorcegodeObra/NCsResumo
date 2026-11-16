import type { NC } from "./types";
import type { PaginaPDF } from "./classify";

/** Extração sem IA: lê os campos direto do texto do PDF. */

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const limpa = (s: string) => s.replace(/\s+/g, " ").trim();

export interface Extraido {
  bloco: string;
  pavimento: string;
  sublocal: string;
  equipe: string;
  ncs: NC[];
}

const ROTULOS = [
  "ITEM DE INSPECAO:",
  "DATA PREVISTA PARA CORRECAO:",
  "DATA REAL DA CORRECAO:",
  "DESCRICAO DO PROBLEMA:",
  "ACOES TOMADAS:",
  "TIPO DE NAO CONFORMIDADE:",
  "RESPONSAVEL:",
];

/** Lê uma página "REGISTRO DE NÃO CONFORMIDADE" (campo: valor, um abaixo do outro). */
export function lerNC(texto: string): NC | null {
  const n = semAcento(texto); // mesmo tamanho do original
  const pos = ROTULOS.map((r) => ({ r, i: n.indexOf(r) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  if (!pos.length) return null;
  const valor = (rotulo: string): string => {
    const k = pos.findIndex((p) => p.r === rotulo);
    if (k < 0) return "";
    const ini = pos[k].i + rotulo.length;
    const fim = k + 1 < pos.length ? pos[k + 1].i : texto.length;
    return limpa(texto.slice(ini, fim));
  };
  const prazo = valor("DATA PREVISTA PARA CORRECAO:").match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)?.[0] ?? "";
  return {
    item: valor("ITEM DE INSPECAO:").replace(/^\d+\s*-\s*/, ""),
    descricao: valor("DESCRICAO DO PROBLEMA:"),
    tipo: valor("TIPO DE NAO CONFORMIDADE:").replace(/^\d+\s*-\s*/, "").replace(/^Servi[çc]o:\s*/i, ""),
    prazo,
    responsavel: valor("RESPONSAVEL:"),
  };
}

export function normalizarPavimento(bruto: string): string {
  const t = semAcento(bruto);
  if (t.includes("TERREO")) return "TÉRREO";
  const m = t.match(/(\d+)\s*[º°O]?\s*(?:PAV|PAVIMENTO)/) || t.match(/PAVIMENTO\s*(?:TIPO\s*)?(\d+)/);
  if (m) return `${Number(m[1])}° PAV.`;
  return limpa(bruto.replace(/pavimento/i, "")).toUpperCase();
}

function acharPavimento(cab: string): string {
  const linhas = cab.split("\n").map(limpa).filter(Boolean);
  // 1) linha logo depois de "Local:"
  const i = linhas.findIndex((l) => /^Local:?$/i.test(l));
  const candidatas = [...(i >= 0 ? linhas.slice(i + 1, i + 3) : []), ...linhas];
  for (const l of candidatas) {
    if (/T[ÉE]RREO|PAVIMENTO|\bPAV\b/i.test(l) && !/^Tarefa:/i.test(l) && !/SERVI[ÇC]O/i.test(l)) {
      return normalizarPavimento(l.replace(/\s+In[ií]cio:.*$/i, ""));
    }
  }
  return "";
}

function acharBloco(cab: string): string {
  const aposEtapa = cab.match(/Etapa:\s*(Bloco\s*\d+)/i);
  const m = aposEtapa?.[1] ?? cab.match(/\bBloco\s*\d+\b/i)?.[0] ?? "";
  return m ? `Bloco ${m.match(/\d+/)![0]}` : "";
}

function acharSublocal(cab: string, arquivo: string): string {
  const v = cab.match(/Sublocal:[ \t]*([^\n]*)/i)?.[1] ?? "";
  const doTexto = v.match(/\b(AP(?:TO)?\.?\s*\d+|HALL\s*[A-Z]+)\b/i)?.[1];
  const doNome = arquivo.match(/(AP(?:TO)?\.?\s*0*\d+|HALL\s*[A-Z]+)/i)?.[1];
  const bruto = doTexto || doNome || "";
  if (!bruto) return "";
  const ap = bruto.match(/^AP(?:TO)?\.?\s*0*(\d+)$/i);
  if (ap) return `AP ${ap[1].padStart(2, "0")}`;
  return bruto.toUpperCase().replace(/\s+/g, " ");
}

function acharEquipe(cab: string): string {
  const v = cab.match(/Equipe\(s\):[ \t]*([^\n]*)/i)?.[1] ?? "";
  const partes = v.split("/").map(limpa).filter(Boolean);
  return [...new Set(partes)].join(" / ");
}

export function extrairLocal(cab: string, paginasNC: string[], arquivo: string): Extraido {
  return {
    bloco: acharBloco(cab),
    pavimento: acharPavimento(cab),
    sublocal: acharSublocal(cab, arquivo),
    equipe: acharEquipe(cab),
    ncs: paginasNC.map(lerNC).filter((x): x is NC => !!x),
  };
}

export type { PaginaPDF };
