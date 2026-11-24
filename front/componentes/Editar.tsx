"use client";
import { useId, useState } from "react";
import type { AjustesPacote, AjusteNC, CampoPacote, PacoteVisao } from "@/compartilhado/dominio/tipos";

const CAMPOS: { campo: CampoPacote; nome: string; max?: number }[] = [
  { campo: "equipes", nome: "Empresa", max: 200 },
  { campo: "tarefa", nome: "Serviço", max: 200 },
  { campo: "bloco", nome: "Bloco", max: 120 },
  { campo: "pavimento", nome: "Pavimento", max: 120 },
  { campo: "prazo", nome: "Prazo" },
];

interface Props {
  p: PacoteVisao;
  onSalvar: (a: AjustesPacote) => void;
  onCancelar: () => void;
}

/** Corrige o que veio da planilha. Manda só o que mudou, para não gravar por cima do que outra pessoa editou. */
export default function Editar({ p, onSalvar, onCancelar }: Props) {
  const id = useId();
  const [original] = useState(p);
  const [pacote, setPacote] = useState(() => Object.fromEntries(CAMPOS.map(({ campo }) => [campo, p[campo] ?? ""])) as Record<CampoPacote, string>);
  const [ncs, setNcs] = useState(() => p.ncs.map(({ id, descricao, sublocal }) => ({ id, descricao, sublocal })));

  const mudarNC = (idNc: string, parte: Partial<AjusteNC>) => setNcs((ns) => ns.map((n) => (n.id === idNc ? { ...n, ...parte } : n)));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const mudou: AjustesPacote = { pacote: {}, ncs: [] };
    for (const { campo } of CAMPOS) if (pacote[campo] !== (original[campo] ?? "")) mudou.pacote[campo] = pacote[campo];
    ncs.forEach((n, i) => {
      const o = original.ncs[i];
      const a: AjusteNC = { id: n.id };
      if (n.descricao !== o.descricao) a.descricao = n.descricao;
      if (n.sublocal !== o.sublocal) a.sublocal = n.sublocal;
      if (Object.keys(a).length > 1) mudou.ncs.push(a);
    });
    if (Object.keys(mudou.pacote).length || mudou.ncs.length) onSalvar(mudou);
    else onCancelar();
  }

  return (
    <form className="editar" onSubmit={salvar}>
      <p className="cinza">A importação não desfaz a edição. Deixe vazio para voltar ao valor da planilha.</p>
      {CAMPOS.map(({ campo, nome, max }) => (
        <div key={campo} className="campo">
          <label htmlFor={`${id}-${campo}`}>{nome}</label>
          <input
            id={`${id}-${campo}`}
            type={campo === "prazo" ? "date" : "text"}
            maxLength={max}
            value={pacote[campo]}
            onChange={(e) => setPacote({ ...pacote, [campo]: e.target.value })}
          />
        </div>
      ))}
      {ncs.map((n, i) => (
        <fieldset key={n.id}>
          <legend>{original.ncs[i].item}</legend>
          <textarea
            aria-label={`Descrição da NC ${n.id}`}
            placeholder="Descrição"
            rows={2}
            maxLength={500}
            value={n.descricao}
            onChange={(e) => mudarNC(n.id, { descricao: e.target.value })}
          />
          <input
            aria-label={`Local da NC ${n.id}`}
            placeholder="Local"
            type="text"
            maxLength={120}
            value={n.sublocal}
            onChange={(e) => mudarNC(n.id, { sublocal: e.target.value })}
          />
        </fieldset>
      ))}
      <div className="botoes">
        <button type="submit" className="botao destaque">
          Salvar edição
        </button>
        <button type="button" className="botao" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
