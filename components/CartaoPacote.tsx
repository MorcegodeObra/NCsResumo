"use client";
import { useId, useState } from "react";
import { NOME_ORIGEM } from "@/lib/dominio/agrupar";
import { dataBR } from "@/lib/dominio/datas";
import type { Coluna, LinhaCard, NCVisao, PacoteVisao } from "@/lib/dominio/tipos";

export const NOME_COLUNA: Record<Coluna, string> = { aberto: "Aberto", corrigido: "Corrigido", concluido: "Concluído" };

function Grupo({ linha, ncs }: { linha: LinhaCard; ncs: NCVisao[] }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const doGrupo = ncs.filter((n) => linha.ncs.includes(n.id));
  return (
    <li>
      <button type="button" className="grupo" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto(!aberto)}>
        {linha.texto}
      </button>
      <ul id={id} className="ncs" hidden={!aberto}>
        {aberto &&
          doGrupo.map((n) => (
            <li key={n.id}>
              {n.sublocal && <strong>{n.sublocal}: </strong>}
              {n.descricao || n.item}
              <small>
                {n.tipo}
                {n.prazo ? ` · prazo ${dataBR(n.prazo)}` : ""}
                {n.situacao === "corrigida" ? ` · corrigida${n.marcadaPor ? ` por ${n.marcadaPor}` : ""}` : ""}
              </small>
            </li>
          ))}
      </ul>
    </li>
  );
}

export default function CartaoPacote({ p }: { p: PacoteVisao }) {
  return (
    <article className={`cartao ${p.origem}`} aria-label={`Pacote ${p.codigo}`}>
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
        </p>
        {p.saiuEm && <p className="cinza">Saiu da planilha em {dataBR(p.saiuEm)}</p>}
        <ul className="resumo">
          {p.linhas.map((l, i) => (
            <Grupo key={i} linha={l} ncs={p.ncs} />
          ))}
        </ul>
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
    </article>
  );
}
