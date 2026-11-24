"use client";
import { useState } from "react";
import { baixar, pacotesParaCSV, pacotesParaTexto } from "@/front/lib/exportar";
import type { PacoteVisao } from "@/compartilhado/dominio/tipos";

/** Copia, baixa ou imprime os pacotes de Aberto e Corrigido. */
export default function Exportar({ pacotes }: { pacotes: PacoteVisao[] }) {
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");

  async function copiar() {
    setErro("");
    setCopiado(false);
    try {
      await navigator.clipboard.writeText(pacotesParaTexto(pacotes));
      setCopiado(true);
    } catch {
      setErro("Não foi possível copiar o texto.");
    }
  }

  return (
    <div className="botoes">
      <button type="button" className="botao" onClick={copiar}>Copiar texto</button>
      <button type="button" className="botao" onClick={() => baixar("ncs.csv", pacotesParaCSV(pacotes), "text/csv;charset=utf-8")}>Baixar CSV</button>
      <button type="button" className="botao" onClick={() => window.print()}>Imprimir</button>
      {copiado && <p className="cinza" aria-live="polite">Texto copiado.</p>}
      {erro && <p role="alert" className="erro">{erro}</p>}
    </div>
  );
}
