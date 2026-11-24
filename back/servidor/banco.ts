import "server-only";
import postgres from "postgres";

/** O que o repositório precisa do banco: consulta com parâmetros e transação. */
export interface Consultor {
  consulta<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}
export interface Banco extends Consultor {
  transacao<T>(fn: (tx: Consultor) => Promise<T>): Promise<T>;
}

type SqlLike = { unsafe(sql: string, params?: any[]): PromiseLike<unknown> };

const consultor = (sql: SqlLike): Consultor => ({
  consulta: async <T>(texto: string, params: unknown[] = []) => (await sql.unsafe(texto, params)) as T[],
});

/** Adapta o postgres.js (ou qualquer objeto com `unsafe` e `begin`) para a interface Banco. */
export function bancoPostgres(sql: SqlLike & { begin<T>(fn: (tx: any) => Promise<T>): Promise<unknown> }): Banco {
  return {
    ...consultor(sql),
    transacao: async <T>(fn: (tx: Consultor) => Promise<T>) => (await sql.begin((tx: SqlLike) => fn(consultor(tx)))) as T,
  };
}

let unico: Banco | undefined;
/** Banco de produção, criado na primeira chamada a partir de DATABASE_URL. */
export function banco(): Banco {
  if (!unico) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não está configurada no servidor.");
    unico = bancoPostgres(postgres(url, { max: 1 }) as any);
  }
  return unico;
}
