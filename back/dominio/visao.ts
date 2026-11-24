// PacoteVisao: o que a interface mostra de um pacote (contracts/api.md).
import { linhaComLocais, linhasLocais, menorPrazo } from "@/compartilhado/dominio/agrupar";
import { assinatura } from "./assinatura";
import { colunaDoPacote, ncsVisiveis, situacaoNC } from "./situacao";
import type { ComentarioVisao, LinhaCard, NCImportada, PacoteImportado, PacoteVisao } from "@/compartilhado/dominio/tipos";

export interface Extras {
  marcacoes?: Record<string, string>; // id da NC → autor
  comentarios?: ComentarioVisao[];
  resumo?: { linhas: LinhaCard[]; assinatura: string } | null; // linhas como a IA escreveu, sem locais
}

export function montarVisao(
  pacote: PacoteImportado & { saiuEm: string | null },
  ncs: NCImportada[],
  { marcacoes = {}, comentarios = [], resumo = null }: Extras,
): PacoteVisao {
  const comSituacao = ncs.map((nc) => ({ ...nc, situacao: situacaoNC(nc, nc.id in marcacoes) }));
  const visiveis = ncsVisiveis(comSituacao) as (NCImportada & { situacao: "aberta" | "corrigida" })[];
  // Só vale enquanto cobre exatamente as NCs visíveis de agora.
  const linhasIA = resumo?.assinatura === assinatura(visiveis) ? resumo.linhas : null;
  return {
    codigo: pacote.codigo,
    tarefa: pacote.tarefa,
    bloco: pacote.bloco,
    pavimento: pacote.pavimento,
    equipes: pacote.equipes,
    coluna: colunaDoPacote(pacote.saiuEm, visiveis),
    origem: visiveis.some((n) => n.origem === "fiscalizacao") || (!visiveis.length && ncs.some((n) => n.origem === "fiscalizacao")) ? "fiscalizacao" : "fvs",
    prazo: menorPrazo(visiveis.map((n) => n.prazo)),
    saiuEm: pacote.saiuEm,
    linhas: linhasIA
      ? linhasIA.map((l) => ({ texto: linhaComLocais(l.texto, visiveis.filter((n) => l.ncs.includes(n.id))), ncs: l.ncs }))
      : linhasLocais(visiveis),
    resumoIA: linhasIA !== null,
    ncs: visiveis.map((n) => ({
      id: n.id,
      item: n.item,
      tipo: n.tipo,
      descricao: n.descricao,
      sublocal: n.sublocal,
      prazo: n.prazo,
      situacao: n.situacao,
      marcadaPor: marcacoes[n.id] ?? null,
    })),
    comentarios,
  };
}
