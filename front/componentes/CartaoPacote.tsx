"use client";
import { useId, useState } from "react";
import Editar from "./Editar";
import Historico from "./Historico";
import { ajustar, definirResolucao, desmarcar, excluir, marcar, resumir } from "@/front/lib/api";
import { NOME_ORIGEM } from "@/compartilhado/dominio/agrupar";
import { dataBR } from "@/compartilhado/dominio/datas";
import { idsAbertas, type AjustesPacote, type Coluna, type LinhaCard, type NCVisao, type PacoteVisao, type Papel } from "@/compartilhado/dominio/tipos";
import { exigirNome } from "@/front/lib/nome";
import { useAcao } from "@/front/lib/useAcao";

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
  abertoInicial?: boolean;
  onMudou?: (p: PacoteVisao) => void;
  onExcluido?: (codigo: string) => void;
}

export default function CartaoPacote({ p, papel = "equipe", abertoInicial = false, onMudou, onExcluido }: Props) {
  const { ocupado, erro, setErro, fazer } = useAcao();
  const [aberto, setAberto] = useState(abertoInicial);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(p.resolucao);
  const [salva, setSalva] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const idResolucao = useId();
  const idHistorico = useId();
  const acoesDoDono = aberto && papel === "dono";

  const mudar = (acao: (autor: string) => Promise<PacoteVisao>) =>
    fazer(async () => {
      // Fora do onMudou?.(): sem o callback, o argumento nem seria avaliado e nada seria gravado.
      const novo = await acao(exigirNome());
      onMudou?.(novo);
    });

  const alternar = (n: NCVisao) => mudar((autor) => (n.situacao === "aberta" ? marcar : desmarcar)(p.codigo, autor, [n.id]));

  function salvarResolucao(e: React.FormEvent) {
    e.preventDefault();
    void fazer(async () => {
      const novo = await definirResolucao(p.codigo, texto);
      // Não troca o que o dono digitou enquanto gravava.
      setTexto((t) => (t === texto ? novo.resolucao : t));
      setSalva(true);
      onMudou?.(novo);
    });
  }

  const salvarEdicao = (a: AjustesPacote) =>
    mudar(async (autor) => {
      const novo = await ajustar(p.codigo, autor, a);
      setEditando(false);
      return novo;
    });

  const gerarResumo = () =>
    fazer(async () => {
      const { pacote, aviso } = await resumir(p.codigo);
      onMudou?.(pacote);
      if (aviso) setErro(aviso);
    });

  function apagar() {
    if (!window.confirm(`Excluir de vez o pacote ${p.codigo} (${p.bloco} · ${p.pavimento}), com as marcações e a possível resolução?`)) return;
    void fazer(async () => {
      await excluir(p.codigo);
      onExcluido?.(p.codigo);
    });
  }

  return (
    <article className={`cartao ${p.origem} ${p.coluna}${aberto ? "" : " fechado"}`} aria-label={`Pacote ${p.codigo}`} aria-busy={ocupado}>
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
          {p.linhas.map((l, i) =>
            // Fechado, a linha é só texto: um botão cortado pelo tamanho fixo receberia o foco sem aparecer.
            aberto ? <Grupo key={i} linha={l} ncs={p.ncs} travado={!!p.saiuEm} onMarcar={alternar} /> : <li key={i}>{l.texto}</li>,
          )}
        </ul>
        {p.resolucao && (
          // Quem edita já vê o texto no campo; este é o da leitura e o da impressão.
          <div className={`resolucao${acoesDoDono ? " so-impressao" : ""}`}>
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
        <div className="botoes">
          <button type="button" className="botao" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
            {aberto ? "Fechar" : "Abrir"}
          </button>
          {aberto && p.coluna === "aberto" && (
            <button type="button" className="botao" onClick={() => mudar((autor) => marcar(p.codigo, autor, idsAbertas(p)))}>
              Mover para Corrigido
            </button>
          )}
          {aberto && (
            <button type="button" className="botao" aria-expanded={editando} onClick={() => setEditando(!editando)}>
              Editar
            </button>
          )}
          {aberto && (
            <button type="button" className="botao" aria-expanded={verHistorico} aria-controls={idHistorico} onClick={() => setVerHistorico(!verHistorico)}>
              Histórico
            </button>
          )}
          {acoesDoDono && p.linhas.length > 0 && (
            <button type="button" className="botao" onClick={gerarResumo}>
              Resumir com IA
            </button>
          )}
          {acoesDoDono && (
            <button type="button" className="botao perigo" onClick={apagar}>
              Excluir
            </button>
          )}
        </div>
        {ocupado && <p className="cinza" aria-live="polite">Aguarde…</p>}
        {erro && <p role="alert" className="erro">{erro}</p>}
        {aberto && editando && <Editar p={p} onSalvar={salvarEdicao} onCancelar={() => setEditando(false)} />}
        <div id={idHistorico}>{aberto && verHistorico && <Historico codigo={p.codigo} versao={p} />}</div>
        {acoesDoDono && (
          <form className="resolver" onSubmit={salvarResolucao}>
            <label htmlFor={idResolucao}>Possível resolução</label>
            <textarea
              id={idResolucao}
              rows={3}
              maxLength={1000}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setSalva(false);
              }}
            />
            <button type="submit" className="botao">
              Salvar resolução
            </button>
            {salva && <p className="cinza" aria-live="polite">Resolução salva.</p>}
          </form>
        )}
      </div>
    </article>
  );
}
