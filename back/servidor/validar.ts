import type { AjusteNC, AjustesPacote, CampoPacote, CargaImportacao, NCImportada, PacoteImportado } from "@/compartilhado/dominio/tipos";
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

/** data-model.md marcacoes.autor: 1 a 60 caracteres. */
export const autor = (v: unknown) => obrigatorio(v, 60, "o seu nome");

/** pacotes.resolucao (specs/002): 0 a 1000 caracteres, com as quebras de linha; vazio apaga. */
export function textoResolucao(v: unknown): string {
  if (typeof v !== "string") throw new ErroHttp(400, "Resolução inválida.");
  const s = v.replace(/\r\n?/g, "\n").trim();
  if (s.length > 1000) throw new ErroHttp(400, "A resolução pode ter no máximo 1000 caracteres.");
  return s;
}

/** Lista de ids de NC, sem repetição. */
export function listaIds(v: unknown, max = 2000): string[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > max) throw new ErroHttp(400, "Lista de NCs inválida.");
  if (!v.every((x) => typeof x === "string" && x.trim() && x.length <= 40)) throw new ErroHttp(400, "Lista de NCs inválida.");
  return [...new Set(v.map((x: string) => x.trim()))];
}

// ---- Carga de importação (contracts/api.md "Importação"; limites de data-model.md) ----

export const LIMITE_PACOTES = 500;
export const LIMITE_NCS = 10_000;
export const LIMITE_BYTES_IMPORTACAO = 3 * 1024 * 1024;

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
function dataOuNull(v: unknown, formato: RegExp, campo: string): string | null {
  if (v === null || v === undefined || v === "") return null;
  const ok = typeof v === "string" && formato.test(v) && !Number.isNaN(Date.parse(v.length === 10 ? `${v}T00:00:00Z` : `${v}Z`));
  // Date.parse aceita 2026-02-31; a volta para ISO pega o dia inexistente.
  if (!ok || new Date(`${v.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== v.slice(0, 10))
    throw new ErroHttp(400, `Data inválida em ${campo}.`);
  return v;
}

const recusar = (msg: string): never => {
  throw new ErroHttp(400, msg);
};

/** Valida a estrutura (400), os limites de quantidade (413) e corta os textos no tamanho do data-model. */
export function validarCargaImportacao(corpo: any): CargaImportacao {
  if (!corpo || !Array.isArray(corpo.pacotes) || !Array.isArray(corpo.ncs)) recusar("Carga de importação inválida.");
  // Sem pacote nenhum, todos os guardados "sairiam" da planilha e iriam para Concluído.
  if (corpo.pacotes.length === 0) recusar("A planilha não tem nenhum pacote.");
  if (corpo.pacotes.length > LIMITE_PACOTES || corpo.ncs.length > LIMITE_NCS)
    throw new ErroHttp(413, `A importação passa do limite de ${LIMITE_PACOTES} pacotes ou ${LIMITE_NCS} NCs.`);

  const codigos = new Set<string>();
  // data-model.md pacotes.codigo (só dígitos), pacotes.tarefa (200), pacotes.bloco (120), pacotes.pavimento (120), pacotes.equipes (200)
  const pacotes: PacoteImportado[] = corpo.pacotes.map((p: any) => {
    const codigo = str(p?.codigo, 20);
    if (!/^\d+$/.test(codigo)) recusar("Pacote com Código Pacote inválido.");
    if (codigos.has(codigo)) recusar(`Pacote ${codigo} repetido na carga.`);
    codigos.add(codigo);
    return { codigo, tarefa: str(p.tarefa, 200), bloco: str(p.bloco, 120), pavimento: str(p.pavimento, 120), equipes: str(p.equipes, 200) };
  });

  const ids = new Set<string>();
  // data-model.md ncs.*: item (200), tipo (200), descricao (500), situacao_item (40), origem (fvs|fiscalizacao),
  // codigo_pacote (pacote da carga), prazo/data_correcao (data ou null), ultima_inspecao (data e hora ou null)
  const ncs: NCImportada[] = corpo.ncs.map((n: any) => {
    const id = str(n?.id, 40);
    if (!id) recusar("NC sem identificador.");
    if (ids.has(id)) recusar(`NC ${id} repetida na carga.`);
    ids.add(id);
    const codigoPacote = str(n.codigoPacote, 20);
    if (!codigos.has(codigoPacote)) recusar(`A NC ${id} aponta para um pacote que não está na carga.`);
    if (n.origem !== "fvs" && n.origem !== "fiscalizacao") recusar(`Origem inválida na NC ${id}.`);
    return {
      id,
      codigoPacote,
      idItem: str(n.idItem, 40),
      item: str(n.item, 200),
      origem: n.origem,
      tipo: str(n.tipo, 200),
      descricao: str(n.descricao, 500),
      sublocal: str(n.sublocal, 120),
      prazo: dataOuNull(n.prazo, DATA, "prazo"),
      dataCorrecao: dataOuNull(n.dataCorrecao, DATA, "data de correção"),
      situacaoItem: str(n.situacaoItem, 40),
      ultimaInspecao: dataOuNull(n.ultimaInspecao, DATA_HORA, "última inspeção"),
    };
  });
  return { pacotes, ncs };
}

// specs/003; mesmos limites da importação
const LIMITES_PACOTE: Record<CampoPacote, number> = { equipes: 200, tarefa: 200, bloco: 120, pavimento: 120, prazo: 10 };
const LIMITES_NC = { descricao: 500, sublocal: 120 };

function camposEditados<K extends string>(v: unknown, limites: Record<K, number>): Partial<Record<K, string>> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) recusar("Edição inválida.");
  const r: Partial<Record<K, string>> = {};
  for (const [campo, valor] of Object.entries(v as object)) {
    if (!Object.hasOwn(limites, campo) || typeof valor !== "string") recusar("Edição inválida.");
    const s = str(valor, Infinity);
    if (s.length > limites[campo as K]) recusar(`O campo ${campo} pode ter no máximo ${limites[campo as K]} caracteres.`);
    r[campo as K] = s;
  }
  return r;
}

/** Corpo de PUT /api/pacotes/:codigo/ajustes. Vazio volta ao valor da planilha. */
export function ajustes(corpo: any): AjustesPacote {
  const pacote = camposEditados(corpo?.pacote ?? {}, LIMITES_PACOTE);
  dataOuNull(pacote.prazo, DATA, "prazo");
  const lista: unknown = corpo?.ncs ?? [];
  if (!Array.isArray(lista) || lista.length > 2000) recusar("Edição inválida.");
  const ncs: AjusteNC[] = (lista as any[]).map((n) => {
    const { id, ...campos } = n ?? {};
    if (typeof id !== "string" || !id || id.length > 40) recusar("NC sem identificador.");
    return { id, ...camposEditados(campos, LIMITES_NC) };
  });
  if (new Set(ncs.map((n) => n.id)).size !== ncs.length) recusar("NC repetida na edição.");
  if (!Object.keys(pacote).length && !ncs.length) recusar("Nada para editar.");
  return { pacote, ncs };
}

/** Código de pacote vindo da URL; fora do formato, o pacote não existe. */
export async function codigoDaRota({ params }: { params: Promise<{ codigo: string }> }): Promise<string> {
  const { codigo } = await params;
  if (!/^\d{1,20}$/.test(codigo)) throw new ErroHttp(404, "Pacote não encontrado.");
  return codigo;
}

/** Identificador da NC vindo da URL; fora do formato, a NC não existe. */
export async function idNcDaRota({ params }: { params: Promise<{ id: string }> }): Promise<string> {
  const { id } = await params;
  if (!/^[\w.-]{1,40}$/.test(id)) throw new ErroHttp(404, "NC não encontrada neste pacote.");
  return id;
}
