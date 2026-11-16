export type Origem = "fvs" | "fiscalizacao";

export interface NC {
  item: string;
  descricao: string;
  tipo: string;
  prazo: string; // dd/mm/aaaa
  responsavel: string;
}

export interface NCComLocal extends NC {
  local: string; // apartamento / área (ex.: "AP 01"), pode ser ""
}

export interface Documento {
  id: string;
  arquivo: string;
  status: "fila" | "lendo" | "ok" | "erro";
  erro?: string;
  origem?: Origem;
  codigo?: string; // ex.: "05.02"
  servico?: string; // ex.: "Alvenaria"
  bloco?: string; // ex.: "Bloco 15"
  pavimento?: string; // ex.: "TÉRREO", "1° PAV."
  sublocal?: string; // ex.: "AP 01"
  equipe?: string; // empresa/equipe executora
  ncs: NC[];
  resumo: string[]; // até 3 linhas
}

export interface Cartao {
  chave: string;
  origem: Origem;
  empresa: string;
  bloco: string;
  pavimento: string;
  servico: string;
  codigo: string;
  titulo: string; // "Bloco 2 · 1° PAV."
  linhas: string[]; // resumo (até 3 linhas)
  prazo: string; // dd/mm/aaaa ou ""
  responsavel: string;
  qtdNCs: number;
  arquivos: string[];
  ncs: NCComLocal[];
  precisaApto?: boolean; // alvenaria sem sublocal: a pessoa digita o apartamento
}
