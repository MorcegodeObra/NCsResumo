import { semAcento } from "@/compartilhado/dominio/normalizar";
import type { PacoteVisao } from "@/compartilhado/dominio/tipos";

/** Sem acento, caixa, pontuação nem zeros à esquerda; "Apto 01" e "AP 1" ficam iguais. */
const normal = (s: string) =>
  semAcento(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b0+(?=\d)/g, "")
    .replace(/\b(?:apto|apartamento)\b/g, "ap")
    .replace(/\bbl\b/g, "bloco")
    .replace(/\bpavimento\b/g, "pav")
    .trim();

const textoDe = (p: PacoteVisao) =>
  [p.codigo, p.bloco, p.pavimento, p.tarefa, p.equipes, p.resolucao, ...p.linhas.map((l) => l.texto), ...p.ncs.flatMap((n) => [n.item, n.tipo, n.descricao, n.sublocal])]
    .map((s) => ` ${normal(s)} `)
    .join("\n");

// Um lugar numerado é um termo só: "bloco 1" não pode achar o Bloco 12 nem o AP 1 do Bloco 2.
const LUGAR = /^(?:(?:bloco|ap) \d+|\d+ pav|hall [a-z])$/;
const TERMOS = /\b(?:(?:bloco|ap) \d+|\d+ pav|hall [a-z])\b|\S+/g;

/** Pacotes que têm todos os termos da busca, em qualquer ordem e campo. */
export function buscar(pacotes: PacoteVisao[], busca: string): PacoteVisao[] {
  const termos = (normal(busca).match(TERMOS) ?? []).map((t) => (LUGAR.test(t) ? ` ${t} ` : t));
  return pacotes.filter((p) => {
    const texto = textoDe(p);
    return termos.every((t) => texto.includes(t));
  });
}
