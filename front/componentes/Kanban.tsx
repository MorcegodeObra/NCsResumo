"use client";
import Link from "next/link";
import { useState } from "react";
import CartaoKanban from "./CartaoKanban";
import { NOME_COLUNA } from "./CartaoPacote";
import { usePapel } from "./Moldura";
import { movimento } from "@/front/lib/mover";
import { useAcao } from "@/front/lib/useAcao";
import { usePacotes } from "@/front/lib/usePacotes";
import type { Coluna, PacoteVisao } from "@/compartilhado/dominio/tipos";

export default function Kanban() {
  const papel = usePapel();
  const { pacotes, erro, trocar } = usePacotes();
  const soltar = useAcao();
  const [arrastado, setArrastado] = useState<PacoteVisao | null>(null);
  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!pacotes) return <p className="cinza">Carregando o kanban…</p>;
  if (!pacotes.length)
    return (
      <p>
        Não há fichas no quadro. <Link href="/importar">Importar a planilha</Link>
      </p>
    );
  const colunas: Coluna[] = papel === "dono" ? ["aberto", "corrigido", "concluido"] : ["aberto", "corrigido"];
  const mov = arrastado && movimento(arrastado, papel);
  return (
    <>
      {soltar.ocupado && <p className="cinza" aria-live="polite">Movendo…</p>}
      {soltar.erro && <p role="alert" className="erro">{soltar.erro}</p>}
      <div className="kanban">
        {colunas.map((c) => {
          const lista = pacotes.filter((p) => p.coluna === c);
          const alvo = mov?.destino === c;
          return (
            <section
              key={c}
              className={`coluna${alvo ? " alvo" : ""}`}
              aria-labelledby={`col-${c}`}
              onDragOver={(e) => alvo && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setArrastado(null);
                if (alvo) void soltar.fazer(async () => trocar(await mov.executar()));
              }}
            >
              <h2 id={`col-${c}`}>
                {NOME_COLUNA[c]} <span>({lista.length})</span>
              </h2>
              <div className="cards">
                {lista.map((p) => (
                  <CartaoKanban key={p.codigo} p={p} papel={papel} onMudou={trocar} onArrastar={setArrastado} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
