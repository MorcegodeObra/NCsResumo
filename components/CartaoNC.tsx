import type { Cartao } from "@/lib/types";
import { NOME_ORIGEM } from "@/lib/agrupar";

const dm = (d: string) => d.split("/").slice(0, 2).join("/");

export default function CartaoNC({ c, carregando }: { c: Cartao; carregando?: boolean }) {
  return (
    <article className={`cartao ${c.origem}`}>
      <header className="faixa">
        <span>ORIGEM: {NOME_ORIGEM[c.origem]}</span>
        <span>{c.empresa ? `EMPRESA: ${c.empresa.toUpperCase()}` : "EMPRESA: ________"}</span>
      </header>
      <div className="corpo">
        <h3>{c.titulo}</h3>
        <p className="servico">{c.servico}</p>
        <ul className="resumo">
          {carregando && c.linhas.length === 0 ? <li className="cinza">resumindo…</li> : null}
          {c.linhas.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
      <footer className="rodape">
        <div>
          <small>PRAZO</small>
          <strong>{c.prazo ? dm(c.prazo) : "__/__"}</strong>
        </div>
        <div>
          <small>RESPONSÁVEL</small>
          <strong className="peq">{c.responsavel || "________"}</strong>
        </div>
        <div>
          <small>RECONFERIDA</small>
          <strong>□ □ □</strong>
        </div>
      </footer>
    </article>
  );
}
