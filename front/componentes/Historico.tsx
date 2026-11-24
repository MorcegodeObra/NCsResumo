"use client";
import { useEffect, useState } from "react";
import { historico } from "@/front/lib/api";
import { dataHoraBR } from "@/compartilhado/dominio/datas";
import type { EventoVisao, SituacaoNC } from "@/compartilhado/dominio/tipos";

const NOME_SITUACAO: Record<SituacaoNC, string> = { aberta: "Aberta", corrigida: "Corrigida", concluida: "Concluída" };
const situacao = (v: unknown) => NOME_SITUACAO[v as SituacaoNC] ?? String(v);

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
    case "resumo_ia_gerado": return "Resumo da IA gerado";
    case "pacote_excluido": return "Pacote excluído";
    default: return tipo;
  }
}

export default function Historico({ codigo }: { codigo: string }) {
  const [eventos, setEventos] = useState<EventoVisao[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    historico(codigo).then(setEventos, (e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar o histórico."));
  }, [codigo]);

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
