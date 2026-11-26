"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import CartaoKanban from "./CartaoKanban";
import { NOME_COLUNA } from "./CartaoPacote";
import { usePapel } from "./Moldura";
import { definirCategoria } from "@/front/lib/api";
import { buscar } from "@/front/lib/buscar";
import { movimento } from "@/front/lib/mover";
import { exigirNome } from "@/front/lib/nome";
import { useAcao } from "@/front/lib/useAcao";
import { usePacotes } from "@/front/lib/usePacotes";
import type { Categoria, Coluna, PacoteVisao, Papel } from "@/compartilhado/dominio/tipos";

/** Colunas do quadro: as situações e, entre Corrigido e Concluído, as categorias (specs/006). */
type ColunaQuadro = Coluna | Categoria;
const NOME_QUADRO: Record<ColunaQuadro, string> = { ...NOME_COLUNA, recorrente: "Recorrentes", projeto: "Projetos" };
const ehCategoria = (c: ColunaQuadro): c is Categoria => c === "recorrente" || c === "projeto";
const naColuna = (p: PacoteVisao, c: ColunaQuadro) => (ehCategoria(c) ? p.categoria === c : p.coluna === c && (c === "concluido" || !p.categoria));

/** O que soltar o card na coluna faz, se fizer algo: dar ou tirar a categoria, ou o movimento da situação. */
function aoSoltar(p: PacoteVisao, c: ColunaQuadro, papel: Papel): (() => Promise<PacoteVisao>) | null {
  if (ehCategoria(c)) return p.categoria !== c && p.coluna !== "concluido" ? () => definirCategoria(p.codigo, exigirNome(), c) : null;
  if (p.categoria) return c === p.coluna ? () => definirCategoria(p.codigo, exigirNome(), null) : null;
  const mov = movimento(p, papel);
  return mov?.destino === c ? mov.executar : null;
}

const PASSO = 10;

/** Urgentes primeiro, depois os de NC mais nova; o resto mantém a ordem do servidor. */
const ordem = (a: PacoteVisao, b: PacoteVisao) => Number(b.urgente) - Number(a.urgente) || (b.recenteEm ?? "").localeCompare(a.recenteEm ?? "");

export default function Kanban() {
  const papel = usePapel();
  const { pacotes: todos, erro, trocar } = usePacotes();
  const soltar = useAcao();
  const [arrastado, setArrastado] = useState<PacoteVisao | null>(null);
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState<Partial<Record<ColunaQuadro, number>>>({});
  const [aba, setAba] = useState<ColunaQuadro>("aberto"); // no celular, uma coluna por vez
  if (erro) return <p role="alert" className="erro">{erro}</p>;
  if (!todos) return <p className="cinza">Carregando o kanban…</p>;
  const pacotes = buscar(todos.filter((p) => !p.arquivadoEm), busca); // os arquivados ficam no Arquivo
  if (!todos.length)
    return (
      <p>
        Não há fichas no quadro. <Link href="/importar">Importar a planilha</Link>
      </p>
    );
  const colunas: ColunaQuadro[] = ["aberto", "corrigido", "recorrente", "projeto", ...(papel === "dono" ? (["concluido"] as const) : [])];
  const listas = Object.fromEntries(colunas.map((c) => [c, pacotes.filter((p) => naColuna(p, c)).sort(ordem)])) as Record<ColunaQuadro, PacoteVisao[]>;
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
              {NOME_QUADRO[c]} <span>{listas[c].length}</span>
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
          const acao = arrastado && aoSoltar(arrastado, c, papel);
          return (
            <section
              key={c}
              className={`coluna ${c}${acao ? " alvo" : ""}${aba === c ? " ativa" : ""}`}
              aria-labelledby={`col-${c}`}
              onDragOver={(e) => acao && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setArrastado(null);
                if (acao) void soltar.fazer(async () => trocar(await acao()));
              }}
            >
              <h2 id={`col-${c}`}>
                {NOME_QUADRO[c]} <span>({lista.length})</span>
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
