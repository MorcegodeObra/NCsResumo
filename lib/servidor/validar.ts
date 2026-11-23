import { ErroHttp } from "./http";

/** Texto de entrada não confiável: espaços normalizados e tamanho limitado. */
export const str = (v: unknown, max = 300): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

function obrigatorio(v: unknown, max: number, nome: string): string {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (!s) throw new ErroHttp(400, `Informe ${nome}.`);
  if (s.length > max) throw new ErroHttp(400, `${nome[0].toUpperCase()}${nome.slice(1)} pode ter no máximo ${max} caracteres.`);
  return s;
}

/** data-model.md marcacoes.autor / comentarios.autor: 1 a 60 caracteres. */
export const autor = (v: unknown) => obrigatorio(v, 60, "o seu nome");

/** data-model.md comentarios.texto: 1 a 1000 caracteres. */
export const textoComentario = (v: unknown) => obrigatorio(v, 1000, "o comentário");

/** Lista de ids de NC, sem repetição. */
export function listaIds(v: unknown, max = 2000): string[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > max) throw new ErroHttp(400, "Lista de NCs inválida.");
  if (!v.every((x) => typeof x === "string" && x.trim() && x.length <= 40)) throw new ErroHttp(400, "Lista de NCs inválida.");
  return [...new Set(v.map((x: string) => x.trim()))];
}
