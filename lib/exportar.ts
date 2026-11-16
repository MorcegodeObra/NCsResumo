import type { Cartao } from "./types";
import { NOME_ORIGEM } from "./agrupar";

const dm = (d: string) => d.split("/").slice(0, 2).join("/");

export function cartaoParaTexto(c: Cartao): string {
  return [
    `ORIGEM: ${NOME_ORIGEM[c.origem]}${c.empresa ? `  |  EMPRESA: ${c.empresa}` : ""}`,
    c.titulo,
    c.servico,
    ...c.linhas.map((l) => `- ${l}`),
    `PRAZO: ${c.prazo ? dm(c.prazo) : "__/__"}  |  RESPONSÁVEL: ${c.responsavel || "________"}  |  RECONFERIDA: □ □ □`,
  ].join("\n");
}

export function cartoesParaTexto(cs: Cartao[]): string {
  return cs.map(cartaoParaTexto).join("\n\n--------------------\n\n");
}

/** Resumo completo: todas as NCs, só texto. */
export function resumoCompleto(cs: Cartao[]): string {
  const bloco = (origem: "fvs" | "fiscalizacao", titulo: string) => {
    const lista = cs.filter((c) => c.origem === origem);
    if (!lista.length) return "";
    const corpo = lista
      .map((c) => {
        const cab = `${c.servico} — ${c.titulo} — ${c.qtdNCs} NC${c.responsavel ? ` — responsável: ${c.responsavel}` : ""}`;
        const linhas = c.ncs.map((n, i) => {
          const local = n.local ? `[${n.local}] ` : "";
          const nome = n.item && n.descricao && n.item !== n.descricao ? `${n.item}: ${n.descricao}` : n.item || n.descricao;
          const extra = [n.tipo && `tipo: ${n.tipo}`, n.prazo && `prazo: ${n.prazo}`]
            .filter(Boolean)
            .join("; ");
          return `  ${i + 1}. ${local}${nome}${extra ? ` (${extra})` : ""}`;
        });
        return [cab, ...linhas].join("\n");
      })
      .join("\n\n");
    return `=== ${titulo} ===\n\n${corpo}`;
  };
  return [bloco("fvs", "FVS (QUALIDADE)"), bloco("fiscalizacao", "FISCALIZAÇÃO")].filter(Boolean).join("\n\n\n");
}

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Colunas B a K da aba NCs da planilha de controle (cole a partir de B2). */
export function cartoesParaCSV(cs: Cartao[]): string {
  const cab = ["Origem", "Empresa", "Bloco", "Pavimento", "Serviço", "Resumo das NCs", "Prazo", "Etapa", "Situação (0/1/2)", "Reconferências (0-3)"];
  const linhas = cs.map((c) =>
    [
      c.origem === "fvs" ? "Qualidade" : "Fiscalização",
      c.empresa,
      c.bloco.replace(/^bloco\s*/i, ""),
      c.pavimento,
      c.servico,
      c.linhas.join("\n"),
      c.prazo,
      c.origem === "fvs" ? "Aguardando NCs Qualidade" : "Aguardando NCs Fiscalização",
      "0",
      "0",
    ].map(esc).join(";")
  );
  return "\ufeff" + [cab.map(esc).join(";"), ...linhas].join("\r\n");
}

export function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
