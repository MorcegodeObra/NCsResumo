"use client";
import Link from "next/link";
import { movimento } from "@/front/lib/mover";
import { useAcao } from "@/front/lib/useAcao";
import type { PacoteVisao, Papel } from "@/compartilhado/dominio/tipos";

interface Props {
  p: PacoteVisao;
  papel: Papel;
  onMudou: (p: PacoteVisao) => void;
  onArrastar: (p: PacoteVisao | null) => void;
}

/** Card do quadro: só o local e o serviço. Clicar abre a ficha; arrastar ou o botão move. */
export default function CartaoKanban({ p, papel, onMudou, onArrastar }: Props) {
  const { ocupado, erro, fazer } = useAcao();
  const mov = movimento(p, papel);
  return (
    <article
      className={`enxuto ${p.origem} ${p.coluna}`}
      aria-label={`Pacote ${p.codigo}`}
      aria-busy={ocupado}
      draggable={!!mov}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", p.codigo); // o Firefox só arrasta com dados
        onArrastar(p);
      }}
      onDragEnd={() => onArrastar(null)}
    >
      <h3>
        <Link href={`/cards/${p.codigo}`} draggable={false}>
          {p.bloco} · {p.pavimento}
        </Link>
      </h3>
      <p>{p.tarefa}</p>
      {mov && (
        <button type="button" className="botao no-print" onClick={() => fazer(async () => onMudou(await mov.executar()))}>
          {mov.nome}
        </button>
      )}
      {ocupado && <p className="cinza" aria-live="polite">Aguarde…</p>}
      {erro && <p role="alert" className="erro">{erro}</p>}
    </article>
  );
}
