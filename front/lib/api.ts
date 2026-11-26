// Cliente fetch tipado usado pelos componentes (contracts/api.md).
import type { AjustesPacote, CargaImportacao, Contagens, EventoVisao, PacoteVisao, Papel, Categoria } from "@/compartilhado/dominio/tipos";

export class ErroApi extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

let aoExpirar: (() => void) | null = null;
/** A página registra aqui o que fazer quando uma chamada autenticada recebe 401. */
export const quandoSessaoExpirar = (fn: (() => void) | null) => void (aoExpirar = fn);

async function chamar<T>(url: string, init: RequestInit & { login?: boolean } = {}): Promise<T> {
  const { login, ...resto } = init;
  const r = await fetch(url, { ...resto, headers: { "content-type": "application/json", ...(resto.headers as object) } });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && !login) aoExpirar?.();
    throw new ErroApi(r.status, corpo?.erro ?? `Erro ${r.status} no servidor.`);
  }
  return corpo as T;
}

export const json = (metodo: string, corpo?: unknown): RequestInit => ({
  method: metodo,
  body: corpo === undefined ? undefined : JSON.stringify(corpo),
});

export async function entrar(senha: string): Promise<Papel> {
  return (await chamar<{ papel: Papel }>("/api/sessao", { ...json("POST", { senha }), login: true })).papel;
}

export const sair = () => chamar("/api/sessao", json("DELETE"));

/** Papel da sessão atual, ou null se não houver sessão. */
export async function papel(): Promise<Papel | null> {
  try {
    return (await chamar<{ papel: Papel }>("/api/sessao", { login: true })).papel;
  } catch (e) {
    if (e instanceof ErroApi && e.status === 401) return null;
    throw e;
  }
}

export { chamar };

// ---- Importação e kanban ----

export async function enviarImportacao(autor: string, carga: CargaImportacao): Promise<Contagens> {
  return (await chamar<{ contagens: Contagens }>("/api/importacoes", json("POST", { autor, ...carga }))).contagens;
}

export async function listarPacotes(): Promise<PacoteVisao[]> {
  return (await chamar<{ pacotes: PacoteVisao[] }>("/api/pacotes")).pacotes;
}

// ---- Ações no pacote ----

const acaoNoPacote = async (codigo: string, caminho: string, init: RequestInit) =>
  (await chamar<{ pacote: PacoteVisao }>(`/api/pacotes/${codigo}/${caminho}`, init)).pacote;

export const marcar = (codigo: string, autor: string, ncs: string[]) => acaoNoPacote(codigo, "marcacoes", json("POST", { autor, ncs }));
export const desmarcar = (codigo: string, autor: string, ncs: string[]) => acaoNoPacote(codigo, "marcacoes", json("DELETE", { autor, ncs }));
export const definirCategoria = (codigo: string, autor: string, categoria: Categoria | null) =>
  acaoNoPacote(codigo, "categoria", json("PUT", { autor, categoria }));
export const ajustar = (codigo: string, autor: string, a: AjustesPacote) => acaoNoPacote(codigo, "ajustes", json("PUT", { autor, ...a }));

export async function historico(codigo: string): Promise<EventoVisao[]> {
  return (await chamar<{ eventos: EventoVisao[] }>(`/api/pacotes/${codigo}/historico`)).eventos;
}

// ---- Só o dono ----

export const concluir = (codigo: string) => acaoNoPacote(codigo, "conclusao", json("POST"));
export const reabrir = (codigo: string) => acaoNoPacote(codigo, "conclusao", json("DELETE"));

export const arquivar = (codigo: string) => acaoNoPacote(codigo, "arquivo", json("POST"));
export const desarquivar = (codigo: string) => acaoNoPacote(codigo, "arquivo", json("DELETE"));
export const arquivarNc = (codigo: string, id: string) => acaoNoPacote(codigo, `ncs/${encodeURIComponent(id)}/arquivo`, json("POST"));
export const desarquivarNc = (codigo: string, id: string) => acaoNoPacote(codigo, `ncs/${encodeURIComponent(id)}/arquivo`, json("DELETE"));
export const definirUrgencia = (codigo: string, urgente: boolean) => acaoNoPacote(codigo, "urgencia", json("PUT", { urgente }));

export const definirResolucao = (codigo: string, texto: string) => acaoNoPacote(codigo, "resolucao", json("PUT", { texto }));

/** Resumo da IA; com `aviso`, a IA falhou e o card continua com o resumo local. */
export const resumir = (codigo: string) =>
  chamar<{ pacote: PacoteVisao; aviso?: string }>(`/api/pacotes/${codigo}/resumo`, json("POST"));

export const excluir = (codigo: string) => chamar(`/api/pacotes/${codigo}`, json("DELETE"));
