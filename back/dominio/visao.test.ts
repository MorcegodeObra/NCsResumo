import { describe, expect, it } from "vitest";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "@/front/planilha/ler";
import { importar } from "@/front/planilha/importar";
import { assinatura } from "./assinatura";
import { montarVisao } from "./visao";

const carga = importar(lerPlanilha(gerarXlsx()));
const visao = (codigo: string, extras = {}) =>
  montarVisao(
    { ...carga.pacotes.find((p) => p.codigo === codigo)!, saiuEm: null },
    carga.ncs.filter((n) => n.codigoPacote === codigo),
    extras,
  );

describe("montarVisao", () => {
  it("pacote com fiscalização aberta: só a fiscalização, FVS escondida, card no formato de referência", () => {
    const v = visao("100001");
    expect(v.origem).toBe("fiscalizacao");
    expect(v.coluna).toBe("aberto");
    expect(v.ncs.map((n) => n.id)).toEqual(["9001", "9002", "9003", "9004", "9005"]); // sem 9006 (concluída) e 9007 (FVS)
    expect(v.linhas).toEqual([
      { texto: "Esquadro entre alvenarias (AP 1-2, HALL A-B) ×4", ncs: ["9001", "9002", "9003", "9004"] },
      { texto: "Planicidade (AP 8)", ncs: ["9005"] },
    ]);
    expect(v.prazo).toBe("2026-10-21");
    expect(v.resumoIA).toBe(false);
    expect(v).toMatchObject({ codigo: "100001", tarefa: "Alvenaria", bloco: "Bloco 1", pavimento: "3º PAV.", equipes: "ALFA", saiuEm: null });
  });

  it("pacote só FVS: concluídas (APROVADO APÓS INSPECAO, NÃO SE APLICA, APROVADA) saem do card", () => {
    const v = visao("100002");
    expect(v.origem).toBe("fvs");
    expect(v.ncs.map((n) => n.id).sort()).toEqual(["9101", "9102", "9103", "9104"]);
    expect(v.ncs.find((n) => n.id === "9101")!.situacao).toBe("corrigida");
    expect(v.linhas[0]).toEqual({ texto: "Limpeza Final (AP 3) ×3", ncs: ["9102", "9103", "9104"] });
    expect(v.coluna).toBe("aberto");
  });

  it("marcações da equipe deixam a NC corrigida e mostram quem marcou", () => {
    const v = visao("100002", { marcacoes: { "9102": "Maria", "9103": "Maria", "9104": "João" } });
    expect(v.ncs.find((n) => n.id === "9104")).toMatchObject({ situacao: "corrigida", marcadaPor: "João" });
    expect(v.coluna).toBe("corrigido");
  });

  it("pacote que saiu da planilha fica em concluído", () => {
    const p = { ...carga.pacotes[0], saiuEm: "2026-11-20T10:00:00Z" };
    const v = montarVisao(p, carga.ncs.filter((n) => n.codigoPacote === p.codigo), {});
    expect(v.coluna).toBe("concluido");
    expect(v.saiuEm).toBe("2026-11-20T10:00:00Z");
  });

  it("repassa a resolução; sem ela, vazio", () => {
    expect(visao("100001", { resolucao: "refazer" }).resolucao).toBe("refazer");
    expect(visao("100001").resolucao).toBe("");
  });

  it("resumo da IA com a assinatura das NCs visíveis: linhas com locais e contagem calculados", () => {
    const { ncs } = visao("100001");
    const linhas = [{ texto: "Alvenaria fora de esquadro e de plano", ncs: ncs.map((n) => n.id) }];
    const v = visao("100001", { resumo: { linhas, assinatura: assinatura(ncs) } });
    expect(v.resumoIA).toBe(true);
    expect(v.linhas).toEqual([{ texto: "Alvenaria fora de esquadro e de plano (AP 1-2-8, HALL A-B) ×5", ncs: ncs.map((n) => n.id) }]);
  });

  it("resumo com assinatura velha ou ausente: linhas locais", () => {
    const local = visao("100001");
    const linhas = [{ texto: "x", ncs: ["9001"] }];
    expect(visao("100001", { resumo: { linhas, assinatura: assinatura(local.ncs.slice(1)) } })).toEqual(local);
    expect(visao("100001", { resumo: null })).toEqual(local);
  });
});
