import Link from "next/link";
import { NOME_ORIGEM } from "@/compartilhado/dominio/agrupar";
import { dataBR } from "@/compartilhado/dominio/datas";
import type { Coluna, PacoteVisao } from "@/compartilhado/dominio/tipos";

export const NOME_COLUNA: Record<Coluna, string> = { aberto: "Aberto", corrigido: "Corrigido", concluido: "Concluído" };

/** Card de /cards: tamanho fixo na tela e na íntegra na impressão. As ações ficam na ficha. */
export default function CartaoPacote({ p }: { p: PacoteVisao }) {
  return (
    <article className={`cartao fechado ${p.origem} ${p.coluna}`} aria-label={`Pacote ${p.codigo}`}>
      <header className="faixa">
        <span>ORIGEM: {NOME_ORIGEM[p.origem]}</span>
        <span>EMPRESA: {p.equipes || "________"}</span>
      </header>
      <div className="corpo">
        <h3>
          {p.bloco} · {p.pavimento}
        </h3>
        <p className="servico">
          {p.tarefa} <span className={`situacao ${p.coluna}`}>{NOME_COLUNA[p.coluna]}</span>
          {p.resumoIA && <span className="situacao no-print" title="Resumo gerado pela IA">IA</span>}
        </p>
        <ul className="resumo">
          {p.linhas.map((l, i) => (
            <li key={i}>{l.texto}</li>
          ))}
        </ul>
        {p.resolucao && (
          <div className="resolucao">
            <strong>Possível resolução</strong>
            <p>{p.resolucao}</p>
          </div>
        )}
      </div>
      <footer className="rodape">
        <div>
          <small>PRAZO</small>
          <strong>{p.prazo ? dataBR(p.prazo) : "__/__"}</strong>
        </div>
        <div>
          <small>RESPONSÁVEL</small>
          <strong className="peq">{p.equipes || "________"}</strong>
        </div>
        <div>
          <small>RECONFERIDA</small>
          <strong>□ □ □</strong>
        </div>
      </footer>
      <div className="acoes no-print">
        <Link className="botao" href={`/cards/${p.codigo}`} aria-label={`Abrir a ficha do pacote ${p.codigo}`}>
          Abrir
        </Link>
      </div>
    </article>
  );
}
