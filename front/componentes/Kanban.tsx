"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import CartaoKanban from "./CartaoKanban";
import { NOME_COLUNA } from "./CartaoPacote";
import { usePapel } from "./Moldura";
import { buscar } from "@/front/lib/buscar";
import { movimento } from "@/front/lib/mover";
import { useAcao } from "@/front/lib/useAcao";
import { usePacotes } from "@/front/lib/usePacotes";
import type { Coluna, PacoteVisao } from "@/compartilhado/dominio/tipos";

const PASSO = 10;

/** Urgentes primeiro, depois os de NC mais nova; o resto mantém a ordem do servidor. */
const ordem = (a: PacoteVisao, b: PacoteVisao) => Number(b.urgente) - Number(a.urgente) || (b.recenteEm ?? "").localeCompare(a.recenteEm ?? "");

export default function Kanban() {
  const papel = usePapel();
  const { pacotes: todos, erro, trocar } = usePacotes();
  const soltar = useAcao();
  const [arrastado, setArrastado] = useState<PacoteVisao | null>(null);
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState<Partial<Record<Coluna, number>>>({});
  const [aba, setAba] = useState<Coluna>("aberto"); // no celular, uma coluna por vez
  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!todos) return <p className="cinza">Carregando o kanban…</p>;
  const pacotes = buscar(todos.filter((p) => !p.arquivadoEm), busca); // os arquivados ficam no Arquivo
  if (!todos.length)
    return (
      <p>
        Não há fichas no quadro. <Link href="/importar">Importar a planilha</Link>
      </p>
    );
  const colunas: Coluna[] = papel === "dono" ? ["aberto", "corrigido", "concluido"] : ["aberto", "corrigido"];
  const listas = Object.fromEntries(colunas.map((c) => [c, pacotes.filter((p) => p.coluna === c).sort(ordem)])) as Record<Coluna, PacoteVisao[]>;
  const mov = arrastado && movimento(arrastado, papel);
  return (
    <div className="pagina-kanban">
      <div className="barra-kanban">
        <div className="busca">
          <Search aria-hidden size={16} />
          <input type="search" aria-label="Buscar no kanban" placeholder="Buscar local, serviço, NC…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="abas" role="group" aria-label="Coluna">
          {colunas.map((c) => (
            <button key={c} type="button" className={`aba ${c}`} aria-pressed={aba === c} onClick={() => setAba(c)}>
              {NOME_COLUNA[c]} <span>{listas[c].length}</span>
            </button>
          ))}
        </div>
        {soltar.ocupado && <p className="cinza" aria-live="polite">Movendo…</p>}
        {soltar.erro && <p role="alert" className="erro">{soltar.erro}</p>}
      </div>
      <div className="kanban">
        {colunas.map((c) => {
          const lista = listas[c];
          const limite = mostrar[c] ?? PASSO;
          const alvo = mov?.destino === c;
          return (
            <section
              key={c}
              className={`coluna ${c}${alvo ? " alvo" : ""}${aba === c ? " ativa" : ""}`}
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
                {lista.slice(0, limite).map((p) => (
                  <CartaoKanban key={p.codigo} p={p} papel={papel} onMudou={trocar} onArrastar={setArrastado} />
                ))}
                {!lista.length && <p className="vazio">{busca ? "Nada encontrado." : "Nenhum card."}</p>}
                {lista.length > limite && (
                  <button type="button" className="botao ver-mais" onClick={() => setMostrar({ ...mostrar, [c]: limite + PASSO })}>
                    <ChevronDown aria-hidden size={16} /> Ver mais ({lista.length - limite})
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
