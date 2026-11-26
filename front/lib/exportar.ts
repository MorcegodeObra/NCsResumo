// Exportação do quadro (contracts/exportacao.md): só os pacotes de Aberto e Corrigido.
import { NOME_ORIGEM } from "@/compartilhado/dominio/agrupar";
import { dataBR } from "@/compartilhado/dominio/datas";
import type { PacoteVisao } from "@/compartilhado/dominio/tipos";

export const exportaveis = (ps: PacoteVisao[]) => ps.filter((p) => p.coluna !== "concluido" && !p.arquivadoEm);

function pacoteParaTexto(p: PacoteVisao): string {
  return [
    `ORIGEM: ${NOME_ORIGEM[p.origem]}${p.equipes ? `  |  EMPRESA: ${p.equipes}` : ""}`,
    `${p.bloco} · ${p.pavimento}`,
    p.tarefa,
    ...p.linhas.map((l) => `- ${l.texto}`),
    `PRAZO: ${p.prazo ? dataBR(p.prazo).slice(0, 5) : "__/__"}  |  RESPONSÁVEL: ${p.equipes || "________"}  |  RECONFERIDA: □ □ □`,
  ].join("\n");
}

export const pacotesParaTexto = (ps: PacoteVisao[]) => exportaveis(ps).map(pacoteParaTexto).join("\n\n--------------------\n\n");

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Colunas B a K da aba NCs da planilha de controle e, na L, a possível resolução (cole a partir de B2). */
export function pacotesParaCSV(ps: PacoteVisao[]): string {
  const cab = ["Origem", "Empresa", "Bloco", "Pavimento", "Serviço", "Resumo das NCs", "Prazo", "Etapa", "Situação (0/1/2)", "Reconferências (0-3)", "Possível resolução"];
  const linhas = exportaveis(ps).map((p) => {
    const origem = p.origem === "fvs" ? "Qualidade" : "Fiscalização";
    return [
      origem,
      p.equipes,
      p.bloco.replace(/^bloco\s*/i, ""),
      p.pavimento,
      p.tarefa,
      p.linhas.map((l) => l.texto).join("\n"),
      dataBR(p.prazo),
      `Aguardando NCs ${origem}`,
      "0",
      "0",
      p.resolucao,
    ];
  });
  return "﻿" + [cab, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
}

export function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
