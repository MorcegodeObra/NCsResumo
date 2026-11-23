// PacoteVisao: o que a interface mostra de um pacote (contracts/api.md).
import { linhasLocais, menorPrazo } from "./agrupar";
import { colunaDoPacote, ncsVisiveis, situacaoNC } from "./situacao";
import type { ComentarioVisao, NCImportada, PacoteImportado, PacoteVisao } from "./tipos";

export interface Extras {
  marcacoes?: Record<string, string>; // id da NC → autor
  comentarios?: ComentarioVisao[];
}

export function montarVisao(
  pacote: PacoteImportado & { saiuEm: string | null },
  ncs: NCImportada[],
  { marcacoes = {}, comentarios = [] }: Extras,
): PacoteVisao {
  const comSituacao = ncs.map((nc) => ({ ...nc, situacao: situacaoNC(nc, nc.id in marcacoes) }));
  const visiveis = ncsVisiveis(comSituacao) as (NCImportada & { situacao: "aberta" | "corrigida" })[];
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
    linhas: linhasLocais(visiveis),
    resumoIA: false,
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
