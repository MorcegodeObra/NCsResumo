"use client";
import Link from "next/link";
import { NOME_COLUNA } from "./CartaoPacote";
import { usePapel } from "./Moldura";
import { usePacotes } from "@/front/lib/usePacotes";
import { NOME_ORIGEM } from "@/compartilhado/dominio/agrupar";
import { dataBR } from "@/compartilhado/dominio/datas";
import { idsAbertas, type Coluna } from "@/compartilhado/dominio/tipos";

const COLUNAS: Coluna[] = ["aberto", "corrigido", "concluido"];

/** Todas as fichas por situação, só para o dono. */
export default function Tabela() {
  const papel = usePapel();
  const { pacotes: todos, erro } = usePacotes();
  const pacotes = todos && todos.filter((p) => !p.arquivadoEm); // os arquivados ficam no Arquivo
  if (papel !== "dono") return <p>Só o dono vê esta página.</p>;
  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!pacotes) return <p className="cinza">Carregando a tabela…</p>;
  return (
    <>
      <p>{COLUNAS.map((c) => `${NOME_COLUNA[c]}: ${pacotes.filter((p) => p.coluna === c).length}`).join(" · ")}</p>
      <div className="rolavel" role="region" aria-label="Tabela de fichas" tabIndex={0}>
        <table>
          <thead>
            <tr>
              {["Situação", "Código", "Local", "Serviço", "Empresa", "Origem", "Prazo", "NCs abertas", "NCs corrigidas", "Concluído em"].map((t) => (
                <th key={t} scope="col">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLUNAS.flatMap((c) => pacotes.filter((p) => p.coluna === c)).map((p) => {
              const abertas = idsAbertas(p).length;
              return (
                <tr key={p.codigo}>
                  <td><span className={`situacao ${p.coluna}`}>{NOME_COLUNA[p.coluna]}</span></td>
                  <td><Link href={`/cards/${p.codigo}`}>{p.codigo}</Link></td>
                  <td>{p.bloco} · {p.pavimento}</td>
                  <td>{p.tarefa}</td>
                  <td>{p.equipes}</td>
                  <td>{NOME_ORIGEM[p.origem]}</td>
                  <td>{dataBR(p.prazo)}</td>
                  <td>{abertas}</td>
                  <td>{p.ncs.length - abertas}</td>
                  <td>{dataBR(p.concluidoEm ?? p.saiuEm)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
