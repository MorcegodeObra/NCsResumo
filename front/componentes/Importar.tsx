"use client";
import { useState } from "react";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { lerPlanilha } from "@/front/planilha/ler";
import { importar } from "@/front/planilha/importar";
import type { CargaImportacao } from "@/compartilhado/dominio/tipos";

/** Lê o .xlsx no aparelho. O arquivo não sai daqui: só a carga estruturada vai para onLido. */
export default function Importar({ onLido, ocupado }: { onLido: (c: CargaImportacao) => void; ocupado?: boolean }) {
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro("");
    setLendo(true);
    try {
      // Dá um respiro para o "lendo…" aparecer antes da leitura, que trava a página por alguns segundos.
      await new Promise((r) => setTimeout(r, 0));
      onLido(importar(lerPlanilha(await arquivo.arrayBuffer())));
    } catch (x) {
      setErro(x instanceof Error ? x.message : "Não foi possível ler a planilha.");
    } finally {
      setLendo(false);
    }
  }

  return (
    <div className="importar">
      {/* O campo fica escondido atrás do rótulo grande, mas segue focável pelo teclado. */}
      <input id="planilha" className="escondido" type="file" accept=".xlsx" onChange={escolher} disabled={lendo || ocupado} />
      <label htmlFor="planilha" className="escolher">
        <FileSpreadsheet aria-hidden size={36} />
        <strong>Escolher a planilha</strong>
        <small>Planilha de inspeções (.xlsx)</small>
      </label>
      {lendo && (
        <p className="cinza andamento" aria-live="polite">
          <LoaderCircle aria-hidden size={18} className="girando" /> Lendo a planilha…
        </p>
      )}
      {erro && <p role="alert" className="erro">{erro}</p>}
    </div>
  );
}
