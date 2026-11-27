"use client";
import Link from "next/link";
import { usePapel } from "./Moldura";
import { desarquivar, desarquivarNc } from "@/front/lib/api";
import { useAcao } from "@/front/lib/useAcao";
import Trava from "./Trava";
import { usePacotes } from "@/front/lib/usePacotes";
import { dataBR } from "@/compartilhado/dominio/datas";
import type { PacoteVisao } from "@/compartilhado/dominio/tipos";

/** O que não vai ser resolvido: cards arquivados e NCs arquivadas de cards que seguem no kanban. Só o dono. */
export default function Arquivo() {
  const papel = usePapel();
  const { pacotes, erro, trocar } = usePacotes();
  const acao = useAcao();
  if (papel !== "dono") return <p>Só o dono vê esta página.</p>;
  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!pacotes) return <p className="cinza">Carregando o arquivo…</p>;
  const cards = pacotes.filter((p) => p.arquivadoEm);
  const soltas = pacotes.filter((p) => !p.arquivadoEm && p.arquivadas.length);
  const fazer = (f: () => Promise<PacoteVisao>) => acao.fazer(async () => trocar(await f()));
  const local = (p: PacoteVisao) => <Link href={`/cards/${p.codigo}`}>{p.bloco} · {p.pavimento} — {p.tarefa}</Link>;
  return (
    <div className="arquivo" aria-busy={acao.ocupado}>
      <Trava ativa={acao.ocupado} />
      {acao.erro && <p role="alert" className="erro">{acao.erro}</p>}
      <section aria-labelledby="arq-cards">
        <h2 id="arq-cards">Cards arquivados ({cards.length})</h2>
        {!cards.length && <p className="cinza">Nenhum card arquivado.</p>}
        <ul className="arquivadas">
          {cards.map((p) => (
            <li key={p.codigo}>
              <span>
                {local(p)}
                <small>arquivado em {dataBR(p.arquivadoEm)} · {p.ncs.length + p.arquivadas.length} NCs</small>
              </span>
              <button type="button" className="botao peq" aria-label={`Desarquivar card ${p.codigo}`} onClick={() => fazer(() => desarquivar(p.codigo))}>
                Desarquivar
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="arq-ncs">
        <h2 id="arq-ncs">NCs arquivadas ({soltas.reduce((t, p) => t + p.arquivadas.length, 0)})</h2>
        {!soltas.length && <p className="cinza">Nenhuma NC arquivada.</p>}
        <ul className="arquivadas">
          {soltas.flatMap((p) =>
            p.arquivadas.map((n) => (
              <li key={n.id}>
                <span>
                  {local(p)}
                  <strong> {n.sublocal}</strong> {n.descricao || n.item}
                  <small>arquivada em {dataBR(n.arquivadaEm)}</small>
                </span>
                <button type="button" className="botao peq" aria-label={`Desarquivar NC ${n.id}`} onClick={() => fazer(() => desarquivarNc(p.codigo, n.id))}>
                  Desarquivar
                </button>
              </li>
            )),
          )}
        </ul>
      </section>
    </div>
  );
}
