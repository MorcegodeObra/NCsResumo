// PacoteVisao: o que a interface mostra de um pacote (contracts/api.md).
import { linhaComLocais, linhasLocais, menorPrazo } from "@/compartilhado/dominio/agrupar";
import { assinatura } from "./assinatura";
import { colunaDoPacote, ncsVisiveis, situacaoNC } from "./situacao";
import type { Categoria, LinhaCard, NCImportada, PacoteImportado, PacoteVisao } from "@/compartilhado/dominio/tipos";

export interface Extras {
  marcacoes?: Record<string, string>; // id da NC → autor
  resolucao?: string;
  prazo?: string | null; // prazo editado pela equipe
  conclusao?: { em: string; ncs: string[] } | null; // dada pelo dono, com as NCs que ela cobre
  resumo?: { linhas: LinhaCard[]; assinatura: string } | null; // linhas como a IA escreveu, sem locais
  arquivo?: { em: string; ncs: string[] } | null; // arquivo do card pelo dono, com as NCs que ele cobre
  arquivadas?: Record<string, string>; // id da NC → quando o dono a arquivou
  urgente?: boolean;
  categoria?: Categoria | null;
  criadas?: Record<string, string>; // id da NC → quando entrou no banco
}

const maior = (datas: (string | undefined)[]) => datas.filter((d): d is string => !!d).sort().at(-1) ?? null;

export function montarVisao(
  pacote: PacoteImportado & { saiuEm: string | null },
  ncs: NCImportada[],
  { marcacoes = {}, resolucao = "", prazo = null, conclusao = null, resumo = null, arquivo = null, arquivadas = {}, urgente = false, categoria = null, criadas = {} }: Extras,
): PacoteVisao {
  const comSituacao = ncs.map((nc) => ({ ...nc, situacao: situacaoNC(nc, nc.id in marcacoes) }));
  const visiveis = ncsVisiveis(comSituacao.filter((n) => !(n.id in arquivadas))) as (NCImportada & { situacao: "aberta" | "corrigida" })[];
  // Só vale enquanto cobre exatamente as NCs visíveis de agora.
  const linhasIA = resumo?.assinatura === assinatura(visiveis) ? resumo.linhas : null;
  // Vale só para as NCs que o dono viu: uma NC nova traz o pacote de volta.
  const coluna = colunaDoPacote(pacote.saiuEm, visiveis, !!conclusao && visiveis.every((n) => conclusao.ncs.includes(n.id)));
  const soltas = comSituacao.filter((n) => n.id in arquivadas && n.situacao !== "concluida") as typeof visiveis;
  // Como a conclusão: o arquivo do card vale só para as NCs que o dono viu. Sem nada pendente, não há o que arquivar.
  const arquivadoEm =
    pacote.saiuEm || (!visiveis.length && !soltas.length) ? null
    : arquivo && visiveis.every((n) => arquivo.ncs.includes(n.id)) ? arquivo.em
    : !visiveis.length ? maior(soltas.map((n) => arquivadas[n.id]))
    : null;
  const paraVisao = (n: (typeof visiveis)[number]) => ({
    id: n.id,
    item: n.item,
    tipo: n.tipo,
    descricao: n.descricao,
    sublocal: n.sublocal,
    prazo: n.prazo,
    situacao: n.situacao,
    marcadaPor: marcacoes[n.id] ?? null,
    arquivadaEm: arquivadas[n.id] ?? null,
  });
  return {
    codigo: pacote.codigo,
    tarefa: pacote.tarefa,
    bloco: pacote.bloco,
    pavimento: pacote.pavimento,
    equipes: pacote.equipes,
    coluna,
    origem: visiveis.some((n) => n.origem === "fiscalizacao") || (!visiveis.length && ncs.some((n) => n.origem === "fiscalizacao")) ? "fiscalizacao" : "fvs",
    prazo: prazo ?? menorPrazo(visiveis.map((n) => n.prazo)),
    saiuEm: pacote.saiuEm,
    concluidoEm: coluna === "concluido" ? (conclusao?.em ?? null) : null,
    arquivadoEm,
    urgente: urgente && coluna !== "concluido" && !arquivadoEm,
    categoria: coluna !== "concluido" && !arquivadoEm ? categoria : null,
    recenteEm: maior(visiveis.map((n) => criadas[n.id])),
    arquivadas: soltas.map(paraVisao),
    linhas: linhasIA
      ? linhasIA.map((l) => ({ texto: linhaComLocais(l.texto, visiveis.filter((n) => l.ncs.includes(n.id))), ncs: l.ncs }))
      : linhasLocais(visiveis),
    resumoIA: linhasIA !== null,
    ncs: visiveis.map(paraVisao),
    resolucao,
  };
}
