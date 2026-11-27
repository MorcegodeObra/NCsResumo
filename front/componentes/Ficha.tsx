"use client";
import { useId, useState } from "react";
import { Archive, ArchiveRestore, ArrowRight, DraftingCompass, Flame, Repeat, Pencil, Printer, Sparkles, Trash2 } from "lucide-react";
import { NOME_CATEGORIA, NOME_COLUNA } from "./CartaoPacote";
import Editar from "./Editar";
import Historico from "./Historico";
import { ajustar, arquivar, arquivarNc, definirCategoria, definirResolucao, definirUrgencia, desarquivar, desarquivarNc, desmarcar, excluir, marcar, resumir } from "@/front/lib/api";
import { movimento } from "@/front/lib/mover";
import { exigirNome } from "@/front/lib/nome";
import { useAcao } from "@/front/lib/useAcao";
import Trava from "./Trava";
import { NOME_ORIGEM } from "@/compartilhado/dominio/agrupar";
import { dataBR } from "@/compartilhado/dominio/datas";
import { idsAbertas, type AjustesPacote, type Categoria, type NCVisao, type PacoteVisao, type Papel } from "@/compartilhado/dominio/tipos";

interface Props {
  p: PacoteVisao;
  papel?: Papel;
  onMudou?: (p: PacoteVisao) => void;
  onExcluido?: (codigo: string) => void;
}

/** Página de um pacote: todas as informações e as ações. */
export default function Ficha({ p, papel = "equipe", onMudou, onExcluido }: Props) {
  const { ocupado, erro, setErro, fazer } = useAcao();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(p.resolucao);
  const [salva, setSalva] = useState(false);
  const id = useId();
  const dono = papel === "dono";
  const mov = movimento(p, papel);
  const abertas = idsAbertas(p).length;

  const trocarPor = (acao: () => Promise<PacoteVisao>) =>
    fazer(async () => {
      // Fora do onMudou?.(): sem o callback, o argumento nem seria avaliado e nada seria gravado.
      const novo = await acao();
      onMudou?.(novo);
    });

  const alternar = (n: NCVisao) => trocarPor(() => (n.situacao === "aberta" ? marcar : desmarcar)(p.codigo, exigirNome(), [n.id]));

  function salvarResolucao(e: React.FormEvent) {
    e.preventDefault();
    void trocarPor(async () => {
      const novo = await definirResolucao(p.codigo, texto);
      // Não troca o que o dono digitou enquanto gravava.
      setTexto((t) => (t === texto ? novo.resolucao : t));
      setSalva(true);
      return novo;
    });
  }

  const salvarEdicao = (a: AjustesPacote) =>
    trocarPor(async () => {
      const novo = await ajustar(p.codigo, exigirNome(), a);
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

  const dados = [
    ["Código", p.codigo],
    ["Origem", NOME_ORIGEM[p.origem]],
    ["Empresa", p.equipes || "—"],
    ["Prazo", p.prazo ? dataBR(p.prazo) : "—"],
    ["NCs abertas", String(abertas)],
    ["NCs corrigidas", String(p.ncs.length - abertas)],
    ...(p.concluidoEm ? [["Concluído pelo dono em", dataBR(p.concluidoEm)]] : []),
    ...(p.arquivadoEm ? [["Arquivado em", dataBR(p.arquivadoEm)]] : []),
    ...(p.saiuEm ? [["Saiu da planilha em", dataBR(p.saiuEm)]] : []),
  ];

  return (
    <article className={`ficha ${p.origem}`} aria-label={`Pacote ${p.codigo}`} aria-busy={ocupado}>
      <header>
        <h2>
          {p.bloco} · {p.pavimento}
        </h2>
        <p className="servico">
          {p.tarefa} <span className={`situacao ${p.coluna}`}>{NOME_COLUNA[p.coluna]}</span>
          {p.resumoIA && <span className="situacao no-print" title="Resumo gerado pela IA">IA</span>}
          {p.categoria && <span className={`situacao ${p.categoria}`}>{NOME_CATEGORIA[p.categoria]}</span>}
          {p.urgente && (
            <span className="situacao urgente">
              <Flame aria-hidden size={12} /> Urgente
            </span>
          )}
        </p>
      </header>
      <div className="botoes no-print">
        {mov && (
          <button type="button" className="botao destaque" onClick={() => trocarPor(mov.executar)}>
            <ArrowRight aria-hidden size={16} /> {mov.nome}
          </button>
        )}
        {(p.categoria || (p.coluna !== "concluido" && !p.arquivadoEm)) &&
          (["recorrente", "projeto"] as Categoria[]).map((c) => (
            <button key={c} type="button" className="botao" aria-pressed={p.categoria === c}
              onClick={() => trocarPor(() => definirCategoria(p.codigo, exigirNome(), p.categoria === c ? null : c))}>
              {c === "recorrente" ? <Repeat aria-hidden size={16} /> : <DraftingCompass aria-hidden size={16} />} {NOME_CATEGORIA[c]}
            </button>
          ))}
        <button type="button" className="botao" aria-expanded={editando} onClick={() => setEditando(!editando)}>
          <Pencil aria-hidden size={16} /> Editar
        </button>
        {dono && p.linhas.length > 0 && (
          <button type="button" className="botao" onClick={gerarResumo}>
            <Sparkles aria-hidden size={16} /> Resumir com IA
          </button>
        )}
        <button type="button" className="botao" onClick={() => window.print()}>
          <Printer aria-hidden size={16} /> Imprimir
        </button>
        {dono && (p.urgente || (p.coluna !== "concluido" && !p.arquivadoEm)) && (
          <button type="button" className="botao" aria-pressed={p.urgente} onClick={() => trocarPor(() => definirUrgencia(p.codigo, !p.urgente))}>
            <Flame aria-hidden size={16} /> {p.urgente ? "Tirar urgência" : "Marcar urgente"}
          </button>
        )}
        {dono && (p.arquivadoEm || p.ncs.length > 0) && (
          <button type="button" className="botao" onClick={() => trocarPor(() => (p.arquivadoEm ? desarquivar : arquivar)(p.codigo))}>
            {p.arquivadoEm ? <ArchiveRestore aria-hidden size={16} /> : <Archive aria-hidden size={16} />} {p.arquivadoEm ? "Desarquivar card" : "Arquivar card"}
          </button>
        )}
        {dono && (
          <button type="button" className="botao perigo" onClick={apagar}>
            <Trash2 aria-hidden size={16} /> Excluir
          </button>
        )}
      </div>
      <Trava ativa={ocupado} />
      {erro && <p role="alert" className="erro no-print">{erro}</p>}
      {editando && (
        <div className="no-print">
          <Editar p={p} onSalvar={salvarEdicao} onCancelar={() => setEditando(false)} />
        </div>
      )}
      <dl className="dados">
        {dados.map(([nome, valor]) => (
          <div key={nome}>
            <dt>{nome}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby={`${id}-ncs`}>
        <h3 id={`${id}-ncs`}>Não conformidades ({p.ncs.length})</h3>
        {!p.ncs.length && <p className="cinza">Nenhuma NC pendente.</p>}
        {p.linhas.map((l, i) => (
          <div key={i} className="linha-nc">
            <h4>{l.texto}</h4>
            <ul>
              {p.ncs
                .filter((n) => l.ncs.includes(n.id))
                .map((n) => (
                  <li key={n.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={n.situacao === "corrigida"}
                        // Corrigida pela planilha (Data Real Correção) não tem marcação para desfazer.
                        disabled={p.coluna === "concluido" || (n.situacao === "corrigida" && !n.marcadaPor)}
                        onChange={() => alternar(n)}
                      />
                      <span>
                        {n.sublocal && <strong>{n.sublocal}: </strong>}
                        {n.descricao || n.item}
                        <small>
                          {[n.item, n.tipo].filter(Boolean).join(" · ")}
                          {n.prazo ? ` · prazo ${dataBR(n.prazo)}` : ""}
                          {n.situacao === "corrigida" ? ` · corrigida${n.marcadaPor ? ` por ${n.marcadaPor}` : ""}` : ""}
                        </small>
                      </span>
                    </label>
                    {dono && (
                      <button type="button" className="botao peq no-print" aria-label={`Arquivar NC ${n.sublocal} ${n.descricao || n.item}`.replace(/\s+/g, " ")} onClick={() => trocarPor(() => arquivarNc(p.codigo, n.id))}>
                        <Archive aria-hidden size={14} /> Arquivar
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
      {dono && p.arquivadas.length > 0 && (
        <section className="no-print" aria-labelledby={`${id}-arq`}>
          <h3 id={`${id}-arq`}>NCs arquivadas ({p.arquivadas.length})</h3>
          <ul className="arquivadas">
            {p.arquivadas.map((n) => (
              <li key={n.id}>
                <span>
                  {n.sublocal && <strong>{n.sublocal}: </strong>}
                  {n.descricao || n.item}
                  <small>arquivada em {dataBR(n.arquivadaEm!)}</small>
                </span>
                <button type="button" className="botao peq" aria-label={`Desarquivar NC ${n.sublocal} ${n.descricao || n.item}`.replace(/\s+/g, " ")} onClick={() => trocarPor(() => desarquivarNc(p.codigo, n.id))}>
                  <ArchiveRestore aria-hidden size={14} /> Desarquivar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(dono || p.resolucao) && (
        <section aria-labelledby={`${id}-res`}>
          <h3 id={`${id}-res`}>Possível resolução</h3>
          {/* O dono já vê o texto no campo; este é o da leitura e o da impressão. */}
          <p className={`texto-resolucao${dono ? " so-impressao" : ""}`}>{p.resolucao}</p>
          {dono && (
            <form className="resolver no-print" onSubmit={salvarResolucao}>
              <textarea
                aria-label="Texto da possível resolução"
                rows={4}
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
        </section>
      )}
      <section className="no-print" aria-labelledby={`${id}-hist`}>
        <h3 id={`${id}-hist`}>Histórico</h3>
        <Historico codigo={p.codigo} versao={p} />
      </section>
    </article>
  );
}
