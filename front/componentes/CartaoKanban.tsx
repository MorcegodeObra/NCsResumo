"use client";
import Link from "next/link";
import { ArrowRight, Flame, MapPin, Undo2, Wrench } from "lucide-react";
import { NOME_COLUNA } from "./CartaoPacote";
import { definirUrgencia } from "@/front/lib/api";
import { movimento } from "@/front/lib/mover";
import { useAcao } from "@/front/lib/useAcao";
import Trava from "./Trava";
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
  const podeUrgir = papel === "dono" && (p.urgente || p.coluna !== "concluido");
  return (
    <article
      className={`enxuto ${p.origem} ${p.coluna}${p.urgente ? " urgente" : ""}`}
      aria-label={`Pacote ${p.codigo}`}
      aria-busy={ocupado}
      draggable={!!mov || p.coluna !== "concluido"} // fora de Concluído, sempre dá para levar a uma categoria
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", p.codigo); // o Firefox só arrasta com dados
        onArrastar(p);
      }}
      onDragEnd={() => onArrastar(null)}
    >
      {p.categoria && <span className={`situacao ${p.coluna}`}>{NOME_COLUNA[p.coluna]}</span>}
      {p.urgente && (
        <span className="selo-urgente">
          <Flame aria-hidden size={13} /> Urgente
        </span>
      )}
      <h3>
        <MapPin aria-hidden size={15} />
        <Link href={`/cards/${p.codigo}`} draggable={false}>
          {p.bloco} · {p.pavimento}
        </Link>
      </h3>
      <p>
        <Wrench aria-hidden size={14} />
        {p.tarefa}
      </p>
      <div className="acoes-card no-print">
        {mov && (
          <button type="button" className="botao" onClick={() => fazer(async () => onMudou(await mov.executar()))}>
            {mov.destino === "corrigido" && p.coluna === "concluido" ? <Undo2 aria-hidden size={15} /> : <ArrowRight aria-hidden size={15} />}
            {mov.nome}
          </button>
        )}
        {podeUrgir && (
          <button
            type="button"
            className={`botao icone${p.urgente ? " ligado" : ""}`}
            aria-label={p.urgente ? "Tirar urgência" : "Marcar como urgente"}
            aria-pressed={p.urgente}
            title={p.urgente ? "Tirar urgência" : "Marcar como urgente"}
            onClick={() => fazer(async () => onMudou(await definirUrgencia(p.codigo, !p.urgente)))}
          >
            <Flame aria-hidden size={16} />
          </button>
        )}
      </div>
      <Trava ativa={ocupado} />
      {erro && <p role="alert" className="erro">{erro}</p>}
    </article>
  );
}
