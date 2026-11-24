import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bancoDeTeste } from "@/back/testes/banco";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "@/front/planilha/ler";
import { importar as lerCarga } from "@/front/planilha/importar";
import type { CargaImportacao } from "@/compartilhado/dominio/tipos";
import { assinatura } from "@/back/dominio/assinatura";
import { buscarPacote, comentar, desmarcar, excluirPacote, historico, importar, listarPacotes, marcar, salvarResumo } from "./repositorio";

let banco: Awaited<ReturnType<typeof bancoDeTeste>>;
beforeEach(async () => (banco = await bancoDeTeste()));
afterEach(() => banco.fechar());

const dia1 = (): CargaImportacao => lerCarga(lerPlanilha(gerarXlsx()));
/** Dia 2: 9001 aprovada, 9002 com data de correção, pacote 100002 ausente. */
const dia2 = (): CargaImportacao => {
  const c = dia1();
  return {
    pacotes: c.pacotes.filter((p) => p.codigo === "100001"),
    ncs: c.ncs
      .filter((n) => n.codigoPacote === "100001")
      .map((n) =>
        n.id === "9001"
          ? { ...n, situacaoItem: "APROVADA", ultimaInspecao: "2026-10-20T08:00:00" }
          : n.id === "9002"
            ? { ...n, dataCorrecao: "2026-10-19" }
            : n,
      ),
  };
};
const eventos = () =>
  banco.consulta<{ tipo: string; codigo_pacote: string; id_nc: string | null; autor: string; detalhe: any }>(
    "SELECT tipo, codigo_pacote, id_nc, autor, detalhe FROM eventos ORDER BY id",
  );

describe("importar", () => {
  it("primeira carga: grava pacotes e NCs, eventos de entrada e a linha de importacoes", async () => {
    const cont = await importar(banco, "Maria", dia1());
    expect(cont).toEqual({ pacotes: 2, novos: 2, saidos: 0, voltaram: 0, ncs: 14, ncsNovas: 14, ncsMudaram: 0 });
    const ev = await eventos();
    expect(ev.filter((e) => e.tipo === "pacote_entrou")).toHaveLength(2);
    expect(ev.filter((e) => e.tipo === "nc_entrou")).toHaveLength(14);
    expect(ev.every((e) => e.autor === "importação")).toBe(true);
    const imp = await banco.consulta<{ autor: string; contagens: any }>("SELECT autor, contagens FROM importacoes");
    expect(imp).toEqual([{ autor: "Maria", contagens: cont }]);
  });

  it("reimportar a mesma carga não gera nenhum evento e não duplica", async () => {
    await importar(banco, "Maria", dia1());
    const antes = (await eventos()).length;
    const cont = await importar(banco, "João", dia1());
    expect(cont).toEqual({ pacotes: 2, novos: 0, saidos: 0, voltaram: 0, ncs: 14, ncsNovas: 0, ncsMudaram: 0 });
    expect(await eventos()).toHaveLength(antes);
    expect(await banco.consulta("SELECT id FROM ncs")).toHaveLength(14);
  });

  it("dia 2: situação muda com antes e depois; pacote ausente sai com a data", async () => {
    await importar(banco, "Maria", dia1());
    const cont = await importar(banco, "Maria", dia2());
    expect(cont).toMatchObject({ pacotes: 1, novos: 0, saidos: 1, ncsMudaram: 2 });
    const ev = (await eventos()).slice(16);
    expect(ev).toContainEqual(
      expect.objectContaining({ tipo: "nc_situacao_mudou", id_nc: "9001", detalhe: { antes: "aberta", depois: "concluida" } }),
    );
    expect(ev).toContainEqual(
      expect.objectContaining({ tipo: "nc_situacao_mudou", id_nc: "9002", detalhe: { antes: "aberta", depois: "corrigida" } }),
    );
    expect(ev).toContainEqual(expect.objectContaining({ tipo: "pacote_saiu", codigo_pacote: "100002", autor: "importação" }));
    const [p] = await banco.consulta<{ saiu_em: unknown }>("SELECT saiu_em FROM pacotes WHERE codigo = '100002'");
    expect(p.saiu_em).not.toBeNull();
  });

  it("pacote que volta: saiu_em volta a null e grava pacote_voltou", async () => {
    await importar(banco, "Maria", dia1());
    await importar(banco, "Maria", dia2());
    const cont = await importar(banco, "Maria", dia1());
    expect(cont.voltaram).toBe(1);
    expect((await eventos()).at(-1)).toBeDefined();
    expect((await eventos()).some((e) => e.tipo === "pacote_voltou" && e.codigo_pacote === "100002")).toBe(true);
    const [p] = await banco.consulta<{ saiu_em: unknown }>("SELECT saiu_em FROM pacotes WHERE codigo = '100002'");
    expect(p.saiu_em).toBeNull();
  });

  it("não toca em marcações nem comentários", async () => {
    await importar(banco, "Maria", dia1());
    await banco.consulta("INSERT INTO marcacoes (id_nc, autor) VALUES ('9102', 'Ana')");
    await banco.consulta("INSERT INTO comentarios (codigo_pacote, autor, texto) VALUES ('100002', 'Ana', 'feito')");
    await importar(banco, "Maria", dia1());
    expect(await banco.consulta("SELECT id_nc, autor FROM marcacoes")).toEqual([{ id_nc: "9102", autor: "Ana" }]);
    expect(await banco.consulta("SELECT autor, texto FROM comentarios")).toEqual([{ autor: "Ana", texto: "feito" }]);
  });

  it("falha no meio desfaz tudo (tudo ou nada)", async () => {
    await importar(banco, "Maria", dia1());
    const ruim = dia2();
    ruim.pacotes[0] = { ...ruim.pacotes[0], tarefa: "Mudou" };
    ruim.ncs.push({ ...ruim.ncs[0], id: "9999", codigoPacote: "777" }); // FK quebra depois do upsert dos pacotes
    await expect(importar(banco, "Maria", ruim)).rejects.toThrow();
    const [p] = await banco.consulta<{ tarefa: string }>("SELECT tarefa FROM pacotes WHERE codigo = '100001'");
    expect(p.tarefa).toBe("Alvenaria");
    expect(await banco.consulta("SELECT * FROM importacoes")).toHaveLength(1);
  });
});

describe("listarPacotes", () => {
  it("devolve a visão com a coluna certa e as NCs visíveis", async () => {
    await importar(banco, "Maria", dia1());
    const ps = await listarPacotes(banco);
    expect(ps.map((p) => [p.codigo, p.coluna, p.origem])).toEqual([
      ["100001", "aberto", "fiscalizacao"],
      ["100002", "aberto", "fvs"],
    ]);
    const p1 = ps[0];
    expect(p1.ncs.map((n) => n.id)).toEqual(["9001", "9002", "9003", "9004", "9005"]);
    expect(p1.linhas[0].texto).toBe("Esquadro entre alvenarias (AP 1-2, HALL A-B) ×4");
    expect(p1.prazo).toBe("2026-10-21");
    expect(p1.saiuEm).toBeNull();
  });

  it("pacote ausente vai para concluído com saiuEm; marcação deixa corrigida e mostra o autor", async () => {
    await importar(banco, "Maria", dia1());
    await importar(banco, "Maria", dia2());
    await banco.consulta("INSERT INTO marcacoes (id_nc, autor) VALUES ('9003', 'Ana')");
    const ps = await listarPacotes(banco);
    const p2 = ps.find((p) => p.codigo === "100002")!;
    expect(p2.coluna).toBe("concluido");
    expect(p2.saiuEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    const p1 = ps.find((p) => p.codigo === "100001")!;
    expect(p1.ncs.find((n) => n.id === "9003")).toMatchObject({ situacao: "corrigida", marcadaPor: "Ana" });
    expect(p1.ncs.some((n) => n.id === "9001")).toBe(false); // concluída
  });
});

describe("marcar e desmarcar", () => {
  beforeEach(async () => void (await importar(banco, "Maria", dia1())));

  it("marcar deixa a NC corrigida, com autor e evento; marcar de novo não gera evento nem troca o autor", async () => {
    const p = await marcar(banco, "100002", "Ana", ["9102"]);
    expect(p.ncs.find((n) => n.id === "9102")).toMatchObject({ situacao: "corrigida", marcadaPor: "Ana" });
    await marcar(banco, "100002", "Bia", ["9102"]);
    const ev = (await eventos()).filter((e) => e.tipo === "nc_marcada");
    expect(ev).toEqual([expect.objectContaining({ codigo_pacote: "100002", id_nc: "9102", autor: "Ana" })]);
  });

  it("marcar todas as abertas visíveis leva o pacote para Corrigido", async () => {
    expect((await marcar(banco, "100002", "Ana", ["9102", "9103", "9104"])).coluna).toBe("corrigido");
  });

  it("NC de outro pacote ou inexistente é ignorada", async () => {
    await marcar(banco, "100002", "Ana", ["9001", "777"]);
    expect(await banco.consulta("SELECT * FROM marcacoes")).toEqual([]);
  });

  it("desmarcar apaga a linha e grava nc_desmarcada; desmarcar o que não está marcado não faz nada", async () => {
    await marcar(banco, "100002", "Ana", ["9102"]);
    const p = await desmarcar(banco, "100002", "Bia", ["9102"]);
    expect(p.ncs.find((n) => n.id === "9102")).toMatchObject({ situacao: "aberta", marcadaPor: null });
    await desmarcar(banco, "100002", "Bia", ["9102"]);
    expect(await banco.consulta("SELECT * FROM marcacoes")).toEqual([]);
    const ev = (await eventos()).filter((e) => e.tipo === "nc_desmarcada");
    expect(ev).toEqual([expect.objectContaining({ id_nc: "9102", autor: "Bia" })]);
  });

  it("NC marcada e depois aprovada fica Concluída e o evento de marcação continua", async () => {
    await marcar(banco, "100001", "Ana", ["9001"]);
    await importar(banco, "Maria", dia2());
    const ev = await eventos();
    expect(ev.some((e) => e.tipo === "nc_marcada" && e.id_nc === "9001")).toBe(true);
    expect(ev).toContainEqual(
      expect.objectContaining({ tipo: "nc_situacao_mudou", id_nc: "9001", detalhe: { antes: "corrigida", depois: "concluida" } }),
    );
    expect((await listarPacotes(banco))[0].ncs.some((n) => n.id === "9001")).toBe(false);
  });

  it("duas marcações simultâneas não se perdem", async () => {
    await Promise.all([marcar(banco, "100002", "Ana", ["9102"]), marcar(banco, "100002", "Bia", ["9103"])]);
    expect(await banco.consulta("SELECT id_nc, autor FROM marcacoes ORDER BY id_nc")).toEqual([
      { id_nc: "9102", autor: "Ana" },
      { id_nc: "9103", autor: "Bia" },
    ]);
    expect((await eventos()).filter((e) => e.tipo === "nc_marcada")).toHaveLength(2);
  });

  it("pacote inexistente dá 404", async () => {
    await expect(marcar(banco, "777", "Ana", ["9102"])).rejects.toMatchObject({ status: 404 });
    await expect(desmarcar(banco, "777", "Ana", ["9102"])).rejects.toMatchObject({ status: 404 });
  });
});

describe("comentar e historico", () => {
  beforeEach(async () => void (await importar(banco, "Maria", dia1())));

  it("comentar grava o comentário e o evento", async () => {
    const p = await comentar(banco, "100001", "Ana", "massa aplicada");
    expect(p.comentarios).toEqual([{ autor: "Ana", texto: "massa aplicada", em: expect.stringMatching(/Z$/) }]);
    expect((await eventos()).at(-1)).toMatchObject({ tipo: "comentario", autor: "Ana", detalhe: { texto: "massa aplicada" } });
    await expect(comentar(banco, "777", "Ana", "x")).rejects.toMatchObject({ status: 404 });
  });

  it("histórico do mais novo para o mais antigo, só do pacote, no máximo 200", async () => {
    await marcar(banco, "100002", "Ana", ["9102"]);
    const h = await historico(banco, "100002");
    expect(h[0]).toEqual({ tipo: "nc_marcada", idNc: "9102", detalhe: {}, autor: "Ana", em: expect.stringMatching(/Z$/) });
    expect(h.at(-1)!.tipo).toBe("pacote_entrou");
    await banco.consulta(
      "INSERT INTO eventos (codigo_pacote, tipo, detalhe, autor) SELECT '100002', 'comentario', '{}', 'Ana' FROM generate_series(1, 250)",
    );
    expect(await historico(banco, "100002")).toHaveLength(200);
  });

  it("pacote sem nenhum evento dá 404", async () => {
    await expect(historico(banco, "777")).rejects.toMatchObject({ status: 404 });
  });
});

describe("salvarResumo", () => {
  beforeEach(async () => void (await importar(banco, "Maria", dia1())));
  const resumir = async () => {
    const { ncs } = await buscarPacote(banco, "100001");
    return salvarResumo(banco, "100001", [{ texto: "Tudo torto", ncs: ncs.map((n) => n.id) }], assinatura(ncs));
  };

  it("grava o resumo, o evento com autor dono e aparece para todos", async () => {
    const p = await resumir();
    expect(p).toMatchObject({ resumoIA: true, linhas: [{ texto: "Tudo torto (AP 1-2-8, HALL A-B) ×5" }] });
    expect((await listarPacotes(banco)).map((x) => x.resumoIA)).toEqual([true, false]);
    expect((await historico(banco, "100001"))[0]).toMatchObject({ tipo: "resumo_ia_gerado", autor: "dono", detalhe: { linhas: 1 } });
    const [l] = await banco.consulta<{ ok: boolean }>("SELECT resumo_em IS NOT NULL AS ok FROM pacotes WHERE codigo = '100001'");
    expect(l.ok).toBe(true);
  });

  it("marcar e reimportar a mesma carga mantêm o resumo; NC concluída o invalida", async () => {
    await resumir();
    expect((await marcar(banco, "100001", "Ana", ["9001"])).resumoIA).toBe(true);
    await importar(banco, "Maria", dia1());
    expect((await buscarPacote(banco, "100001")).resumoIA).toBe(true);
    await importar(banco, "Maria", dia2());
    expect((await buscarPacote(banco, "100001")).resumoIA).toBe(false);
  });

  it("pacote inexistente: 404 e nenhum evento", async () => {
    await expect(salvarResumo(banco, "777", [], "x")).rejects.toMatchObject({ status: 404 });
    expect((await eventos()).some((e) => e.tipo === "resumo_ia_gerado")).toBe(false);
  });
});

describe("excluirPacote", () => {
  beforeEach(async () => void (await importar(banco, "Maria", dia1())));

  it("apaga pacote, NCs, marcações e comentários; o histórico fica, com o que foi apagado", async () => {
    await marcar(banco, "100002", "Ana", ["9102"]);
    await comentar(banco, "100002", "Ana", "feito");
    await excluirPacote(banco, "100002");
    expect((await listarPacotes(banco)).map((p) => p.codigo)).toEqual(["100001"]);
    for (const t of ["ncs", "comentarios"])
      expect(await banco.consulta(`SELECT 1 FROM ${t} WHERE codigo_pacote = '100002'`)).toEqual([]);
    expect(await banco.consulta("SELECT * FROM marcacoes")).toEqual([]);
    const h = await historico(banco, "100002");
    expect(h[0]).toMatchObject({
      tipo: "pacote_excluido", autor: "dono",
      detalhe: { tarefa: "Alvenaria", bloco: "Bloco 2", pavimento: "TÉRREO", ncs: 7, marcacoes: 1, comentarios: 1 },
    });
    expect(h.some((e) => e.tipo === "nc_marcada")).toBe(true);
  });

  it("pacote inexistente: 404", async () => {
    await expect(excluirPacote(banco, "777")).rejects.toMatchObject({ status: 404 });
  });
});
