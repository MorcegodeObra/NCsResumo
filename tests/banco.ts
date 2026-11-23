// Banco em memória (PGlite) com o mesmo schema de produção, para os testes.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import type { Banco } from "@/lib/servidor/banco";

export const SCHEMA = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

export async function bancoDeTeste(): Promise<Banco & { aplicarSchema(): Promise<void>; fechar(): Promise<void> }> {
  const db = new PGlite();
  await db.exec(SCHEMA);
  type Q = { query: PGlite["query"] };
  const consultor = (q: Q) => ({
    consulta: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
      (await q.query<T>(sql, params)).rows,
  });
  return {
    ...consultor(db),
    transacao: (fn) => db.transaction((tx) => fn(consultor(tx as unknown as Q))),
    aplicarSchema: async () => void (await db.exec(SCHEMA)),
    fechar: () => db.close(),
  };
}
