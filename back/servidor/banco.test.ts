import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bancoDeTeste } from "@/back/testes/banco";

let banco: Awaited<ReturnType<typeof bancoDeTeste>>;
beforeEach(async () => (banco = await bancoDeTeste()));
afterEach(() => banco.fechar());

const pacote = ["100001", "Alvenaria", "Bloco 1", "3º PAV.", "ALFA"];
const inserirPacote = "INSERT INTO pacotes (codigo, tarefa, bloco, pavimento, equipes) VALUES ($1, $2, $3, $4, $5)";

describe("Banco", () => {
  it("o schema aplica duas vezes sem erro", async () => {
    await expect(banco.aplicarSchema()).resolves.toBeUndefined();
  });

  it("consulta com parâmetros", async () => {
    await banco.consulta(inserirPacote, pacote);
    const linhas = await banco.consulta<{ codigo: string }>("SELECT codigo FROM pacotes WHERE bloco = $1", ["Bloco 1"]);
    expect(linhas).toEqual([{ codigo: "100001" }]);
  });

  it("transacao desfaz tudo quando a função lança erro", async () => {
    await expect(
      banco.transacao(async (tx) => {
        await tx.consulta(inserirPacote, pacote);
        throw new Error("falha no meio");
      }),
    ).rejects.toThrow("falha no meio");
    expect(await banco.consulta("SELECT * FROM pacotes")).toEqual([]);
  });

  it("transacao confirma quando dá certo e devolve o valor", async () => {
    const r = await banco.transacao(async (tx) => {
      await tx.consulta(inserirPacote, pacote);
      return "ok";
    });
    expect(r).toBe("ok");
    expect(await banco.consulta("SELECT codigo FROM pacotes")).toHaveLength(1);
  });

  it("o CHECK de pacotes.codigo recusa código não numérico", async () => {
    await expect(banco.consulta(inserirPacote, ["MENTOR", "x", "x", "x", "x"])).rejects.toThrow();
  });
});

// Adaptador de produção (postgres.js), testado com um `sql` falso: sem rede.
import { bancoPostgres } from "./banco";

describe("bancoPostgres", () => {
  function sqlFalso() {
    const chamadas: { sql: string; params: unknown[]; tx: boolean }[] = [];
    const faz = (tx: boolean) => ({
      unsafe: async (sql: string, params: unknown[] = []) => {
        chamadas.push({ sql, params, tx });
        return [{ ok: 1 }];
      },
    });
    const sql = { ...faz(false), begin: async <T>(fn: (t: ReturnType<typeof faz>) => Promise<T>) => fn(faz(true)) };
    return { sql, chamadas };
  }

  it("consulta repassa SQL e parâmetros para sql.unsafe", async () => {
    const { sql, chamadas } = sqlFalso();
    const b = bancoPostgres(sql);
    expect(await b.consulta("SELECT $1", [7])).toEqual([{ ok: 1 }]);
    expect(chamadas).toEqual([{ sql: "SELECT $1", params: [7], tx: false }]);
  });

  it("transacao usa sql.begin e a conexão da transação", async () => {
    const { sql, chamadas } = sqlFalso();
    const r = await bancoPostgres(sql).transacao(async (tx) => {
      await tx.consulta("UPDATE x SET y = $1", [1]);
      return "feito";
    });
    expect(r).toBe("feito");
    expect(chamadas).toEqual([{ sql: "UPDATE x SET y = $1", params: [1], tx: true }]);
  });
});
