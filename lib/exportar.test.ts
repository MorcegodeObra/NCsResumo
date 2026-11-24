import { describe, expect, it } from "vitest";
import { pacoteVisao } from "@/tests/fixtures/visao";
import { pacotesParaCSV, pacotesParaTexto } from "./exportar";

const fisc = pacoteVisao();
const fvs = pacoteVisao({ codigo: "100002", origem: "fvs", coluna: "corrigido", bloco: "BLOCO 12", equipes: "", prazo: null, linhas: [{ texto: 'Vão de 2" torto', ncs: ["1"] }] });
const concluido = pacoteVisao({ codigo: "100003", coluna: "concluido", bloco: "Bloco 99" });

describe("pacotesParaCSV (contracts/exportacao.md)", () => {
  it("BOM, ;, CRLF, aspas, cabeçalho e colunas B a K; só Aberto e Corrigido", () => {
    expect(pacotesParaCSV([fisc, concluido, fvs])).toBe(
      "﻿" +
        '"Origem";"Empresa";"Bloco";"Pavimento";"Serviço";"Resumo das NCs";"Prazo";"Etapa";"Situação (0/1/2)";"Reconferências (0-3)"\r\n' +
        '"Fiscalização";"ALFA";"1";"3º PAV.";"Alvenaria";"Esquadro entre alvenarias (AP 1-2, HALL A-B) ×2\nPlanicidade (AP 8)";"21/10/2026";"Aguardando NCs Fiscalização";"0";"0"\r\n' +
        '"Qualidade";"";"12";"3º PAV.";"Alvenaria";"Vão de 2"" torto";"";"Aguardando NCs Qualidade";"0";"0"',
    );
  });
});

describe("pacotesParaTexto", () => {
  it("formato do quadro, separado por traços; só Aberto e Corrigido", () => {
    expect(pacotesParaTexto([fisc, concluido, fvs])).toBe(
      [
        "ORIGEM: FISCALIZAÇÃO  |  EMPRESA: ALFA",
        "Bloco 1 · 3º PAV.",
        "Alvenaria",
        "- Esquadro entre alvenarias (AP 1-2, HALL A-B) ×2",
        "- Planicidade (AP 8)",
        "PRAZO: 21/10  |  RESPONSÁVEL: ALFA  |  RECONFERIDA: □ □ □",
        "",
        "--------------------",
        "",
        "ORIGEM: QUALIDADE",
        "BLOCO 12 · 3º PAV.",
        "Alvenaria",
        '- Vão de 2" torto',
        "PRAZO: __/__  |  RESPONSÁVEL: ________  |  RECONFERIDA: □ □ □",
      ].join("\n"),
    );
  });
});
