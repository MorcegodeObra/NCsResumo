"use client";
import { useMemo, useState } from "react";
import CartaoPacote, { NOME_COLUNA } from "./CartaoPacote";
import Importar from "./Importar";
import { montarVisao } from "@/lib/dominio/visao";
import type { CargaImportacao, Coluna, Papel, PacoteVisao } from "@/lib/dominio/tipos";

const COLUNAS: Coluna[] = ["aberto", "corrigido", "concluido"];

export function Kanban({ pacotes }: { pacotes: PacoteVisao[] }) {
  return (
    <div className="kanban">
      {COLUNAS.map((c) => {
        const lista = pacotes.filter((p) => p.coluna === c);
        return (
          <section key={c} className="coluna" aria-labelledby={`col-${c}`}>
            <h2 id={`col-${c}`}>
              {NOME_COLUNA[c]} <span>({lista.length})</span>
            </h2>
            <div className="cards">
              {lista.map((p) => (
                <CartaoPacote key={p.codigo} p={p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function Quadro({ papel }: { papel: Papel }) {
  const [carga, setCarga] = useState<CargaImportacao | null>(null);
  const pacotes = useMemo(
    () =>
      carga?.pacotes.map((p) => montarVisao({ ...p, saiuEm: null }, carga.ncs.filter((n) => n.codigoPacote === p.codigo), {})) ?? [],
    [carga],
  );
  return (
    <section data-testid="quadro" data-papel={papel}>
      <div className="barra no-print">
        <Importar onLido={setCarga} />
      </div>
      {carga ? <Kanban pacotes={pacotes} /> : <p className="cinza">Escolha a planilha de inspeções do dia para ver os pacotes.</p>}
    </section>
  );
}
