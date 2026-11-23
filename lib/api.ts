// Cliente fetch tipado usado pelos componentes (contracts/api.md).
import type { Papel } from "@/lib/dominio/tipos";

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
