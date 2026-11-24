// postgres.js de verdade (o adaptador de produção) falando com um Postgres pelo protocolo de rede.
// O servidor é o PGlite exposto por socket; nada de Docker nem de nuvem.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";
import { SCHEMA } from "@/back/testes/banco";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "@/front/planilha/ler";
import { importar as lerCarga } from "@/front/planilha/importar";
import { bancoPostgres } from "./banco";
import { assinatura } from "@/back/dominio/assinatura";
import { importar, listarPacotes, salvarResumo } from "./repositorio";

let db: PGlite;
let servidor: PGLiteSocketServer;
let sql: ReturnType<typeof postgres>;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SCHEMA);
  servidor = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1" });
  await servidor.start();
  const [host, porta] = servidor.getServerConn().split(":");
  sql = postgres({ host, port: Number(porta), database: "postgres", username: "postgres", max: 1, ssl: false });
});
afterAll(async () => {
  await sql?.end();
  await servidor?.stop();
  await db?.close();
});

describe("bancoPostgres com postgres.js real", () => {
  it("importa a carga (listas, datas, jsonb) e lista igual ao PGlite direto", async () => {
    const banco = bancoPostgres(sql as any);
    const carga = lerCarga(lerPlanilha(gerarXlsx()));
    expect(await importar(banco, "Maria", carga)).toMatchObject({ pacotes: 2, ncs: 14, ncsNovas: 14 });
    expect(await importar(banco, "Maria", carga)).toMatchObject({ novos: 0, ncsNovas: 0, ncsMudaram: 0 });
    const ps = await listarPacotes(banco);
    expect(ps.map((p) => [p.codigo, p.coluna])).toEqual([["100001", "aberto"], ["100002", "aberto"]]);
    expect(ps[0].prazo).toBe("2026-10-21");
    expect(ps[0].linhas[0].texto).toBe("Esquadro entre alvenarias (AP 1-2, HALL A-B) ×4");
    const [imp] = await banco.consulta<{ contagens: any }>("SELECT contagens FROM importacoes ORDER BY id LIMIT 1");
    expect(imp.contagens.ncs).toBe(14);
    const r = await salvarResumo(banco, "100001", [{ texto: "x", ncs: ps[0].ncs.map((n) => n.id) }], assinatura(ps[0].ncs));
    expect(r).toMatchObject({ resumoIA: true, linhas: [{ ncs: ps[0].ncs.map((n) => n.id) }] });
  }, 30_000);

  it("transação desfaz tudo quando falha", async () => {
    const banco = bancoPostgres(sql as any);
    await expect(
      banco.transacao(async (tx) => {
        await tx.consulta("UPDATE pacotes SET tarefa = 'X'");
        throw new Error("falha");
      }),
    ).rejects.toThrow("falha");
    const linhas = await banco.consulta<{ tarefa: string }>("SELECT DISTINCT tarefa FROM pacotes");
    expect(linhas).toEqual([{ tarefa: "Alvenaria" }]);
  });
});
