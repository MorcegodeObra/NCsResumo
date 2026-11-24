"use client";
import { useId, useState } from "react";
import Historico from "./Historico";
import { comentar, desmarcar, excluir, marcar, resumir } from "@/lib/api";
import { NOME_ORIGEM } from "@/lib/dominio/agrupar";
import { dataBR, dataHoraBR } from "@/lib/dominio/datas";
import type { Coluna, LinhaCard, NCVisao, PacoteVisao, Papel } from "@/lib/dominio/tipos";
import { exigirNome } from "@/lib/nome";

export const NOME_COLUNA: Record<Coluna, string> = { aberto: "Aberto", corrigido: "Corrigido", concluido: "Concluído" };

function Grupo({ linha, ncs, travado, onMarcar }: { linha: LinhaCard; ncs: NCVisao[]; travado: boolean; onMarcar: (n: NCVisao) => void }) {
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
              <label>
                <input
                  type="checkbox"
                  checked={n.situacao === "corrigida"}
                  // Corrigida pela planilha (Data Real Correção) não tem marcação para desfazer.
                  disabled={travado || (n.situacao === "corrigida" && !n.marcadaPor)}
                  onChange={() => onMarcar(n)}
                />
                <span>
                  {n.sublocal && <strong>{n.sublocal}: </strong>}
                  {n.descricao || n.item}
                  <small>
                    {n.tipo}
                    {n.prazo ? ` · prazo ${dataBR(n.prazo)}` : ""}
                    {n.situacao === "corrigida" ? ` · corrigida${n.marcadaPor ? ` por ${n.marcadaPor}` : ""}` : ""}
                  </small>
                </span>
              </label>
            </li>
          ))}
      </ul>
    </li>
  );
}

interface Props {
  p: PacoteVisao;
  papel?: Papel;
  onMudou?: (p: PacoteVisao) => void;
  onExcluido?: (codigo: string) => void;
}

export default function CartaoPacote({ p, papel = "equipe", onMudou, onExcluido }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [comentario, setComentario] = useState("");
  const [verHistorico, setVerHistorico] = useState(false);
  const idComentario = useId();
  const idHistorico = useId();

  /** Uma ação por vez; ignora o clique em vez de desabilitar, para o foco do teclado não se perder. */
  async function fazer(acao: () => Promise<void>) {
    if (ocupado) return;
    setErro("");
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar.");
    } finally {
      setOcupado(false);
    }
  }
  const mudar = (acao: (autor: string) => Promise<PacoteVisao>) =>
    fazer(async () => {
      // Fora do onMudou?.(): sem o callback, o argumento nem seria avaliado e nada seria gravado.
      const novo = await acao(exigirNome());
      onMudou?.(novo);
    });

  const abertas = p.ncs.filter((n) => n.situacao === "aberta").map((n) => n.id);
  const alternar = (n: NCVisao) => mudar((autor) => (n.situacao === "aberta" ? marcar : desmarcar)(p.codigo, autor, [n.id]));

  function enviarComentario(e: React.FormEvent) {
    e.preventDefault();
    void mudar(async (autor) => {
      const novo = await comentar(p.codigo, autor, comentario);
      setComentario("");
      return novo;
    });
  }

  const gerarResumo = () =>
    fazer(async () => {
      const { pacote, aviso } = await resumir(p.codigo);
      onMudou?.(pacote);
      if (aviso) setErro(aviso);
    });

  function apagar() {
    if (!window.confirm(`Excluir de vez o pacote ${p.codigo} (${p.bloco} · ${p.pavimento}), com as marcações e os comentários?`)) return;
    void fazer(async () => {
      await excluir(p.codigo);
      onExcluido?.(p.codigo);
    });
  }

  return (
    <article className={`cartao ${p.origem}`} aria-label={`Pacote ${p.codigo}`} aria-busy={ocupado}>
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
        {p.saiuEm && <p className="cinza">Saiu da planilha em {dataBR(p.saiuEm)}</p>}
        <ul className="resumo">
          {p.linhas.map((l, i) => (
            <Grupo key={i} linha={l} ncs={p.ncs} travado={!!p.saiuEm} onMarcar={alternar} />
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
      <div className="acoes no-print">
        <div className="botoes">
          {p.coluna === "aberto" && (
            <button type="button" className="botao" onClick={() => mudar((autor) => marcar(p.codigo, autor, abertas))}>
              Mover para Corrigido
            </button>
          )}
          <button type="button" className="botao" aria-expanded={verHistorico} aria-controls={idHistorico} onClick={() => setVerHistorico(!verHistorico)}>
            Histórico
          </button>
          {papel === "dono" && p.linhas.length > 0 && (
            <button type="button" className="botao" onClick={gerarResumo}>
              Resumir com IA
            </button>
          )}
          {papel === "dono" && (
            <button type="button" className="botao perigo" onClick={apagar}>
              Excluir
            </button>
          )}
        </div>
        {ocupado && <p className="cinza" aria-live="polite">Aguarde…</p>}
        {erro && <p role="alert" className="erro">{erro}</p>}
        <div id={idHistorico}>{verHistorico && <Historico codigo={p.codigo} />}</div>
        {p.comentarios.length > 0 && (
          <ul className="historico" aria-label="Comentários">
            {p.comentarios.map((c, i) => (
              <li key={i}>
                {c.texto}
                <small>
                  {c.autor} · {dataHoraBR(c.em)}
                </small>
              </li>
            ))}
          </ul>
        )}
        <form className="comentar" onSubmit={enviarComentario}>
          <label htmlFor={idComentario}>Comentário</label>
          <textarea id={idComentario} rows={2} maxLength={1000} required value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <button type="submit" className="botao">
            Comentar
          </button>
        </form>
      </div>
    </article>
  );
}
