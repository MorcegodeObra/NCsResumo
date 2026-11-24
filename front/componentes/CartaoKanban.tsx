"use client";
import Link from "next/link";
import { marcar } from "@/front/lib/api";
import { exigirNome } from "@/front/lib/nome";
import { useAcao } from "@/front/lib/useAcao";
import { idsAbertas, type PacoteVisao } from "@/compartilhado/dominio/tipos";

/** Card enxuto do kanban: só o local e o serviço. O resto fica em /cards. */
export default function CartaoKanban({ p, onMudou }: { p: PacoteVisao; onMudou: (p: PacoteVisao) => void }) {
  const { ocupado, erro, fazer } = useAcao();
  return (
    <article className={`cartao enxuto ${p.coluna}`} aria-label={`Pacote ${p.codigo}`} aria-busy={ocupado}>
      <h3>
        {p.bloco} · {p.pavimento}
      </h3>
      <p>{p.tarefa}</p>
      <div className="botoes no-print">
        {p.coluna === "aberto" && (
          <button type="button" className="botao" onClick={() => fazer(async () => onMudou(await marcar(p.codigo, exigirNome(), idsAbertas(p))))}>
            Mover para Corrigido
          </button>
        )}
        <Link className="botao" href={`/cards?q=${p.codigo}`}>
          Abrir card
        </Link>
      </div>
      {ocupado && <p className="cinza" aria-live="polite">Aguarde…</p>}
      {erro && <p role="alert" className="erro">{erro}</p>}
    </article>
  );
}
