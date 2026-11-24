"use client";
import { useState } from "react";
import CartaoPacote from "./CartaoPacote";
import Exportar from "./Exportar";
import { usePapel } from "./Moldura";
import { resumirFila } from "@/front/lib/resumirFila";
import { usePacotes } from "@/front/lib/usePacotes";
import { semAcento } from "@/compartilhado/dominio/normalizar";
import type { PacoteVisao } from "@/compartilhado/dominio/tipos";

const normal = (s: string) => semAcento(s).toLowerCase().trim();
const textoDe = (p: PacoteVisao) =>
  normal([p.codigo, `${p.bloco} · ${p.pavimento}`, p.tarefa, p.equipes, p.resolucao, ...p.linhas.map((l) => l.texto), ...p.ncs.map((n) => `${n.item} ${n.descricao}`)].join("\n"));

export default function Cards({ busca: inicial = "" }: { busca?: string }) {
  const papel = usePapel();
  const { pacotes, erro, trocar, tirar } = usePacotes();
  const [busca, setBusca] = useState(inicial);
  const [progresso, setProgresso] = useState("");
  const [aviso, setAviso] = useState("");

  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!pacotes) return <p className="cinza">Carregando os cards…</p>;

  const procurado = normal(busca);
  const achados = pacotes.filter((p) => textoDe(p).includes(procurado));

  async function resumirTodos() {
    setAviso("");
    setAviso(await resumirFila(pacotes!, setProgresso, trocar));
    setProgresso("");
  }

  return (
    <>
      <div className="barra no-print">
        <div className="campo">
          <label htmlFor="busca">Buscar por código, local, serviço ou problema</label>
          <input id="busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {papel === "dono" && (
          <button type="button" className="botao" onClick={resumirTodos} disabled={!!progresso}>
            Resumir todos
          </button>
        )}
        <Exportar pacotes={achados} />
        {progresso && <p className="cinza" aria-live="polite">{progresso}</p>}
        {aviso && <p className="aviso" aria-live="polite">{aviso}</p>}
      </div>
      {achados.length ? (
        <div className="grade">
          {achados.map((p) => (
            <CartaoPacote key={p.codigo} p={p} papel={papel} completo onMudou={trocar} onExcluido={tirar} />
          ))}
        </div>
      ) : (
        <p className="cinza">Nenhum card encontrado.</p>
      )}
    </>
  );
}
