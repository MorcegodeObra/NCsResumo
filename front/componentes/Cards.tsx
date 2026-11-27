"use client";
import { useState } from "react";
import CartaoPacote from "./CartaoPacote";
import Exportar from "./Exportar";
import { usePapel } from "./Moldura";
import { buscar } from "@/front/lib/buscar";
import { resumirFila } from "@/front/lib/resumirFila";
import { usePacotes } from "@/front/lib/usePacotes";
import { useBusca } from "@/front/lib/useBusca";

export default function Cards() {
  const papel = usePapel();
  const { pacotes, erro, trocar } = usePacotes();
  const [busca, setBusca] = useBusca("cards");
  const [progresso, setProgresso] = useState("");
  const [aviso, setAviso] = useState("");

  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!pacotes) return <p className="cinza">Carregando os cards…</p>;

  // As concluídas ficam no kanban e na tabela do dono; as arquivadas, no Arquivo.
  const achados = buscar(pacotes.filter((p) => p.coluna !== "concluido" && !p.arquivadoEm), busca);

  async function resumirTodos() {
    setAviso("");
    setAviso(await resumirFila(pacotes!.filter((p) => !p.arquivadoEm), setProgresso, trocar));
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
            <CartaoPacote key={p.codigo} p={p} />
          ))}
        </div>
      ) : (
        <p className="cinza">Nenhum card encontrado.</p>
      )}
    </>
  );
}
