"use client";
import Link from "next/link";
import CartaoPacote, { NOME_COLUNA } from "./CartaoPacote";
import { usePacotes } from "@/front/lib/usePacotes";
import type { Coluna } from "@/compartilhado/dominio/tipos";

const COLUNAS: Coluna[] = ["aberto", "corrigido", "concluido"];

export default function Kanban() {
  const { pacotes, erro, trocar } = usePacotes();
  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!pacotes) return <p className="cinza">Carregando o kanban…</p>;
  if (!pacotes.length)
    return (
      <p>
        Ainda não há pacotes. <Link href="/importar">Importar a planilha</Link>
      </p>
    );
  return (
    <div className="kanban">
      {COLUNAS.map((c) => {
        const lista = pacotes.filter((p) => p.coluna === c);
        return (
          <section key={c} className="coluna" aria-labelledby={`col-${c}`}>
            <h2 id={`col-${c}`}>
              {NOME_COLUNA[c]} <span>({lista.length})</span>
            </h2>
            <div className="cards">
              {lista.map((p) => (
                <CartaoPacote key={p.codigo} p={p} onMudou={trocar} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
