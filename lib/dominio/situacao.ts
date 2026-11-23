// Regras calculadas (data-model.md): nada disso é gravado no banco.
import type { Coluna, Origem, SituacaoNC } from "./tipos";

export function situacaoNC(
  nc: { situacaoItem: string; ultimaInspecao: string | null; dataCorrecao: string | null },
  marcada: boolean,
): SituacaoNC {
  if (nc.ultimaInspecao && nc.situacaoItem !== "REPROVADA") return "concluida";
  if (nc.dataCorrecao || marcada) return "corrigida";
  return "aberta";
}

/** Não concluídas; se alguma for de fiscalização, só as de fiscalização. */
export function ncsVisiveis<T extends { origem: Origem; situacao: SituacaoNC }>(ncs: T[]): T[] {
  const ativas = ncs.filter((n) => n.situacao !== "concluida");
  return ativas.some((n) => n.origem === "fiscalizacao") ? ativas.filter((n) => n.origem === "fiscalizacao") : ativas;
}

export function colunaDoPacote(saiuEm: string | null, visiveis: { situacao: SituacaoNC }[]): Coluna {
  if (saiuEm || visiveis.length === 0) return "concluido";
  return visiveis.some((n) => n.situacao === "aberta") ? "aberto" : "corrigido";
}
