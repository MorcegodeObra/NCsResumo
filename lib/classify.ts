import type { Origem } from "./types";

export interface PaginaPDF {
  numero: number;
  texto: string;
}

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

export interface InfoServico {
  origem: Origem;
  codigo: string;
  servico: string;
}

/**
 * Descobre se a ficha é FVS (da qualidade) ou de fiscalização.
 * No PDF o cabeçalho traz "SERVIÇO: FVS 05.02 - Alvenaria" ou
 * "SERVIÇO: FISCALIZAÇÃO 05.02 - Alvenaria".
 */
export function classificar(textoPrimeiraPagina: string, textoTodo = ""): InfoServico {
  const t = textoPrimeiraPagina.replace(/\s+/g, " ");
  const m = t.match(/SERVI[ÇC]O:\s*(FISCALIZA[ÇC][ÃA]O|FVS)\s*([\d.]+)?\s*-?\s*(.*?)(?=\s{2,}|\s(?:Tarefa|Etapa|Local|Sublocal|Endere[çc]o|Inspecionado)\s*:|$)/i);
  if (m) {
    const origem: Origem = semAcento(m[1]).startsWith("FISCALIZA") ? "fiscalizacao" : "fvs";
    return { origem, codigo: (m[2] || "").trim(), servico: (m[3] || "").trim() };
  }
  // plano B: procura a palavra "fiscalização" em qualquer parte do documento
  const todo = semAcento(textoTodo || textoPrimeiraPagina);
  return { origem: todo.includes("FISCALIZACAO") ? "fiscalizacao" : "fvs", codigo: "", servico: "" };
}

/** Texto do cabeçalho (primeira página, até a tabela de itens). */
export function cabecalho(paginas: PaginaPDF[]): string {
  const t = paginas[0]?.texto ?? "";
  const i = semAcento(t).indexOf("ITEM DE INSPECAO");
  return (i > 0 ? t.slice(0, i) : t).slice(0, 3000);
}

/** Texto de cada página "REGISTRO DE NÃO CONFORMIDADE" (sem a parte de evidências). */
export function paginasDeNC(paginas: PaginaPDF[]): string[] {
  const saida: string[] = [];
  for (const p of paginas) {
    const n = semAcento(p.texto);
    const ini = n.indexOf("REGISTRO DE NAO CONFORMIDADE");
    if (ini < 0) continue;
    let fim = n.indexOf("EVIDENCIA DE NAO CONFORMIDADES", ini);
    if (fim < 0) fim = p.texto.length;
    // semAcento preserva o tamanho do texto, então os índices servem no original
    saida.push(p.texto.slice(ini, fim).slice(0, 3500));
  }
  return saida;
}
