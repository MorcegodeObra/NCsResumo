// Tipos compartilhados pela interface e pelo servidor (data-model.md, contracts/api.md).

export type Origem = "fvs" | "fiscalizacao";
export type SituacaoNC = "aberta" | "corrigida" | "concluida";
export type Coluna = "aberto" | "corrigido" | "concluido";
export type Papel = "equipe" | "dono";

/** Pacote como sai do navegador na importação (campos já formatados). */
export interface PacoteImportado {
  codigo: string;
  tarefa: string;
  bloco: string;
  pavimento: string;
  equipes: string;
}

/** NC como sai do navegador na importação (uma por Identificador Vínculo Problema). */
export interface NCImportada {
  id: string;
  codigoPacote: string;
  idItem: string;
  item: string;
  origem: Origem;
  tipo: string;
  descricao: string;
  sublocal: string;
  prazo: string | null; // aaaa-mm-dd
  dataCorrecao: string | null; // aaaa-mm-dd
  situacaoItem: string; // REPROVADA, APROVADA…
  ultimaInspecao: string | null; // aaaa-mm-ddThh:mm:ss
}

export interface CargaImportacao {
  pacotes: PacoteImportado[];
  ncs: NCImportada[];
}

export interface LinhaCard {
  texto: string;
  ncs: string[]; // ids das NCs que a linha cobre
}

export interface NCVisao {
  id: string;
  item: string;
  tipo: string;
  descricao: string;
  sublocal: string;
  prazo: string | null;
  situacao: "aberta" | "corrigida";
  marcadaPor: string | null;
}

export interface PacoteVisao {
  codigo: string;
  tarefa: string;
  bloco: string;
  pavimento: string;
  equipes: string;
  coluna: Coluna;
  origem: Origem;
  prazo: string | null;
  saiuEm: string | null;
  linhas: LinhaCard[];
  resumoIA: boolean;
  ncs: NCVisao[];
  resolucao: string;
}

export interface EventoVisao {
  tipo: string;
  idNc: string | null;
  detalhe: Record<string, unknown>;
  autor: string;
  em: string;
}

export interface Contagens {
  pacotes: number;
  novos: number;
  saidos: number;
  voltaram: number;
  ncs: number;
  ncsNovas: number;
  ncsMudaram: number;
}
