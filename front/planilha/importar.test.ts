import { describe, expect, it } from "vitest";
import { gerarXlsx, LINHAS } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "./ler";
import { importar } from "./importar";

const carga = (linhas = LINHAS) => importar(lerPlanilha(gerarXlsx(linhas)));
const nc = (id: string, c = carga()) => c.ncs.find((n) => n.id === id)!;

describe("importar", () => {
  it("um pacote por Código Pacote, com os campos formatados", () => {
    expect(carga().pacotes).toEqual([
      { codigo: "100001", tarefa: "Alvenaria", bloco: "Bloco 1", pavimento: "3º PAV.", equipes: "ALFA" },
      { codigo: "100002", tarefa: "Alvenaria", bloco: "Bloco 2", pavimento: "TÉRREO", equipes: "BETA / GAMA" },
    ]);
  });

  it("cada NC vira um registro só, mesmo com várias reinspeções", () => {
    const c = carga();
    expect(c.ncs.map((n) => n.id).sort()).toEqual(
      ["9001", "9002", "9003", "9004", "9005", "9006", "9007", "9101", "9102", "9103", "9104", "9105", "9106", "9107"],
    );
  });

  it("NC com 3 reinspeções: campos da inspeção mais recente e formatados", () => {
    expect(nc("9001")).toEqual({
      id: "9001",
      codigoPacote: "100001",
      idItem: "8001",
      item: "Esquadro entre alvenarias",
      origem: "fiscalizacao",
      tipo: "Serviço: Não atendimento ao procedimento executivo",
      descricao: "esquadro incompatível",
      sublocal: "AP 1",
      prazo: "2026-10-21",
      dataCorrecao: null,
      situacaoItem: "REPROVADA",
      ultimaInspecao: "2026-10-10T08:00:00",
    });
  });

  it("a situação do item conta as linhas do item sem NC", () => {
    expect(nc("9105").situacaoItem).toBe("APROVADO APÓS INSPECAO");
    expect(nc("9105").ultimaInspecao).toBe("2026-10-15T09:00:00");
    expect(nc("9106").situacaoItem).toBe("NÃO SE APLICA");
  });

  it("no empate de data, vence o maior Identificador Histórico Item", () => {
    expect(nc("9107").situacaoItem).toBe("APROVADA");
  });

  it("linha do item sem Data Inspeção não muda nada", () => {
    expect(nc("9101").situacaoItem).toBe("REPROVADA");
    expect(nc("9101").dataCorrecao).toBe("2026-10-18");
  });

  it("sublocais '.', vazio e AP03", () => {
    expect(nc("9102").sublocal).toBe("");
    expect(nc("9103").sublocal).toBe("");
    expect(nc("9104").sublocal).toBe("AP 3");
    expect(nc("9004").sublocal).toBe("HALL B");
  });

  it("origem FVS × fiscalização por Descrição FVS", () => {
    expect(nc("9007").origem).toBe("fvs");
    expect(nc("9003").origem).toBe("fiscalizacao");
  });

  // Princípio I / research.md R5: só os campos listados saem do navegador.
  it("a saída tem só os campos autorizados, sem nomes de pessoas nem colunas não usadas", () => {
    const comSegredos = LINHAS.map((l) =>
      l["Identificador Vínculo Problema"] ? { ...l, "Ações Tomadas": "ACAO-SECRETA", Endereço: "ENDERECO-SECRETO" } : l,
    );
    const c = carga(comSegredos);
    expect(Object.keys(c.pacotes[0]).sort()).toEqual(["bloco", "codigo", "equipes", "pavimento", "tarefa"]);
    expect(Object.keys(c.ncs[0]).sort()).toEqual(
      ["codigoPacote", "dataCorrecao", "descricao", "id", "idItem", "item", "origem", "prazo", "situacaoItem", "sublocal", "tipo", "ultimaInspecao"],
    );
    const json = JSON.stringify(c);
    for (const proibido of ["INSPETOR FICTICIO", "COLABORADOR FICTICIO", "ACAO-SECRETA", "ENDERECO-SECRETO", "7001-ALFA"])
      expect(json).not.toContain(proibido);
  });
});
