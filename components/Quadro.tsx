"use client";
import { useCallback, useEffect, useState } from "react";
import CartaoPacote, { NOME_COLUNA } from "./CartaoPacote";
import Exportar from "./Exportar";
import Importar from "./Importar";
import { enviarImportacao, listarPacotes, resumir } from "@/lib/api";
import { exigirNome } from "@/lib/nome";
import type { CargaImportacao, Coluna, Contagens, Papel, PacoteVisao } from "@/lib/dominio/tipos";

const COLUNAS: Coluna[] = ["aberto", "corrigido", "concluido"];

interface PropsKanban {
  pacotes: PacoteVisao[];
  papel: Papel;
  onMudou: (p: PacoteVisao) => void;
  onExcluido: (codigo: string) => void;
}

export function Kanban({ pacotes, ...props }: PropsKanban) {
  return (
    <div className="kanban">
      {COLUNAS.map((c) => {
        const lista = pacotes.filter((p) => p.coluna === c);
        return (
          <section key={c} className={`coluna ${c}`} aria-labelledby={`col-${c}`}>
            <h2 id={`col-${c}`}>
              {NOME_COLUNA[c]} <span>({lista.length})</span>
            </h2>
            <div className="cards">
              {lista.map((p) => (
                <CartaoPacote key={p.codigo} p={p} {...props} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const resumoContagens = (c: Contagens) =>
  `Importação gravada: ${c.pacotes} pacotes (${c.novos} novos, ${c.saidos} saíram, ${c.voltaram} voltaram), ` +
  `${c.ncs} NCs (${c.ncsNovas} novas, ${c.ncsMudaram} mudaram de situação).`;

export default function Quadro({ papel }: { papel: Papel }) {
  const [pacotes, setPacotes] = useState<PacoteVisao[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [progresso, setProgresso] = useState("");

  const carregar = useCallback(async () => {
    try {
      setPacotes(await listarPacotes());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar o quadro.");
    }
  }, []);
  useEffect(() => void carregar(), [carregar]);

  async function importar(carga: CargaImportacao) {
    setErro("");
    setAviso("");
    setEnviando(true);
    try {
      setAviso(resumoContagens(await enviarImportacao(exigirNome(), carga)));
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar a importação.");
    } finally {
      setEnviando(false);
    }
  }

  const trocar = (novo: PacoteVisao) => setPacotes((ps) => ps && ps.map((p) => (p.codigo === novo.codigo ? novo : p)));
  const tirar = (codigo: string) => setPacotes((ps) => ps && ps.filter((p) => p.codigo !== codigo));

  /** Um pacote por vez (limite da IA); quem já tem resumo válido ou está em Concluído fica de fora. */
  async function resumirTodos() {
    const fila = (pacotes ?? []).filter((p) => p.coluna !== "concluido" && !p.resumoIA);
    if (!fila.length) return setAviso("Todos os cards já têm o resumo da IA.");
    setErro("");
    let feitos = 0;
    try {
      for (const [i, p] of fila.entries()) {
        setAviso("");
        setProgresso(`Resumindo ${i + 1} de ${fila.length}…`);
        const r = await resumir(p.codigo);
        trocar(r.pacote);
        if (r.pacote.resumoIA) feitos++;
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar os resumos.");
    } finally {
      setProgresso("");
      const locais = fila.length - feitos;
      setAviso(
        `${feitos} de ${fila.length} pacotes resumidos` +
          (locais ? `; ${locais} ${locais === 1 ? "ficou" : "ficaram"} com o resumo local.` : "."),
      );
    }
  }

  return (
    <section data-testid="quadro" data-papel={papel}>
      <div className="barra no-print">
        <Importar onLido={importar} ocupado={enviando || !!progresso} />
        {papel === "dono" && (
          <button type="button" className="botao" onClick={resumirTodos} disabled={enviando || !!progresso || !pacotes}>
            Resumir todos
          </button>
        )}
        {pacotes && <Exportar pacotes={pacotes} />}
        {progresso && <p className="cinza" aria-live="polite">{progresso}</p>}
        {enviando && <p className="cinza" aria-live="polite">Gravando a importação…</p>}
        {aviso && <p className="aviso" aria-live="polite">{aviso}</p>}
        {erro && <p role="alert" className="erro">{erro}</p>}
      </div>
      {pacotes ? <Kanban pacotes={pacotes} papel={papel} onMudou={trocar} onExcluido={tirar} /> : !erro && <p className="cinza">Carregando o quadro…</p>}
    </section>
  );
}
