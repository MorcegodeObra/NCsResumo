"use client";
import { useEffect, useState } from "react";
import { historico } from "@/front/lib/api";
import { dataBR, dataHoraBR } from "@/compartilhado/dominio/datas";
import type { EventoVisao, SituacaoNC } from "@/compartilhado/dominio/tipos";

const NOME_SITUACAO: Record<SituacaoNC, string> = { aberta: "Aberta", corrigida: "Corrigida", concluida: "Concluída" };
const situacao = (v: unknown) => NOME_SITUACAO[v as SituacaoNC] ?? String(v);
const NOME_CAMPO: Record<string, string> = {
  equipes: "Empresa", tarefa: "Serviço", bloco: "Bloco", pavimento: "Pavimento", prazo: "Prazo", descricao: "descrição", sublocal: "local",
};
function edicao(d: EventoVisao["detalhe"]): string {
  const valor = (v: unknown) => (d.campo === "prazo" ? dataBR(v as string | null) : String(v ?? ""));
  const nome = NOME_CAMPO[String(d.campo)] ?? String(d.campo);
  const genero = ["equipes", "descricao"].includes(String(d.campo)) ? "editada" : "editado";
  return `${nome} ${genero}: “${valor(d.antes)}” → “${valor(d.depois)}”`;
}

function descrever({ tipo, idNc, detalhe: d }: EventoVisao): string {
  switch (tipo) {
    case "pacote_entrou": return "Pacote entrou na planilha";
    case "pacote_saiu": return "Pacote saiu da planilha";
    case "pacote_voltou": return "Pacote voltou à planilha";
    case "nc_entrou": return `NC ${idNc} entrou como ${situacao(d.situacao)}`;
    case "nc_situacao_mudou": return `NC ${idNc} passou de ${situacao(d.antes)} para ${situacao(d.depois)}`;
    case "nc_marcada": return `NC ${idNc} marcada como corrigida`;
    case "nc_desmarcada": return `NC ${idNc} desmarcada`;
    case "comentario": return `Comentou: ${d.texto}`;
    case "resolucao_alterada": return d.depois ? `Possível resolução: ${d.depois}` : "Possível resolução apagada";
    case "pacote_editado": return edicao(d);
    case "nc_editada": return `NC ${idNc}, ${edicao(d)}`;
    case "resumo_ia_gerado": return "Resumo da IA gerado";
    case "pacote_concluido": return "Pacote concluído pelo dono";
    case "pacote_reaberto": return "Conclusão do dono desfeita";
    case "pacote_arquivado": return "Card arquivado pelo dono";
    case "pacote_desarquivado": return "Card desarquivado";
    case "nc_arquivada": return `NC ${idNc} arquivada pelo dono`;
    case "nc_desarquivada": return `NC ${idNc} desarquivada`;
    case "pacote_urgente": return "Marcado como urgente";
    case "pacote_nao_urgente": return "Urgência retirada";
    case "categoria_mudou": return d.depois ? `Categoria: ${d.depois === "projeto" ? "Projeto" : "Recorrente"}` : "Categoria retirada";
    case "pacote_excluido": return "Pacote excluído";
    default: return tipo;
  }
}

/** Recarrega quando `versao` (o pacote do card) muda. */
export default function Historico({ codigo, versao }: { codigo: string; versao?: object }) {
  const [eventos, setEventos] = useState<EventoVisao[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vale = true;
    historico(codigo).then(
      (evs) => {
        if (!vale) return;
        setErro("");
        setEventos(evs);
      },
      (e) => vale && setErro(e instanceof Error ? e.message : "Não foi possível carregar o histórico."),
    );
    return () => {
      vale = false;
    };
  }, [codigo, versao]);

  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!eventos) return <p className="cinza">Carregando o histórico…</p>;
  return (
    <ol className="historico" aria-label="Histórico do pacote">
      {eventos.map((e, i) => (
        <li key={i}>
          {descrever(e)}
          <small>
            {e.autor} · {dataHoraBR(e.em)}
          </small>
        </li>
      ))}
    </ol>
  );
}
