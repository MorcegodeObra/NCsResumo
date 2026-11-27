"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ClipboardList, Download, FileSearch, KanbanSquare, LoaderCircle, Package, Sparkles, Upload } from "lucide-react";
import Importar from "./Importar";
import { usePapel } from "./Moldura";
import { enviarImportacao, listarPacotes } from "@/front/lib/api";
import { exigirNome } from "@/front/lib/nome";
import { resumirFila } from "@/front/lib/resumirFila";
import type { CargaImportacao, Contagens } from "@/compartilhado/dominio/tipos";

const PASSOS = [
  [Download, "Exporte do sistema de inspeção a planilha “Base de Dados de Inspeções” (.xlsx)."],
  [Upload, "Escolha o arquivo abaixo. Ele é lido no seu aparelho e não sai dele."],
  [FileSearch, "Confira o resultado e veja o kanban."],
] as const;

export default function PaginaImportar() {
  const papel = usePapel();
  const [andamento, setAndamento] = useState("");
  const [gravada, setGravada] = useState<Contagens | null>(null);
  const [resumos, setResumos] = useState("");
  const [erro, setErro] = useState("");

  async function importar(carga: CargaImportacao) {
    setErro("");
    setGravada(null);
    setResumos("");
    setAndamento("Gravando a importação…");
    try {
      setGravada(await enviarImportacao(exigirNome(), carga));
      if (papel === "dono") setResumos(await resumirFila(await listarPacotes(), setAndamento, () => {}));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar a importação.");
    } finally {
      setAndamento("");
    }
  }

  return (
    <section className="passos" aria-labelledby="titulo-importar">
      <h2 id="titulo-importar">Importar a planilha do dia</h2>
      <ol>
        {PASSOS.map(([Icone, texto], i) => (
          <li key={i}>
            <span className="numero" aria-hidden><Icone size={18} /></span>
            {texto}
          </li>
        ))}
      </ol>
      <Importar onLido={importar} ocupado={!!andamento} />
      <div aria-live="polite">
        {andamento && (
          <p className="cinza andamento">
            <LoaderCircle aria-hidden size={18} className="girando" /> {andamento}
          </p>
        )}
        {gravada && (
          <div className="resultado">
            <p className="ok">
              <CheckCircle2 aria-hidden size={20} /> <strong>Importação gravada.</strong>
            </p>
            <ul className="contagens">
              <li>
                <Package aria-hidden size={18} /> <strong>{gravada.pacotes}</strong> pacotes
                <small>{gravada.novos} novos · {gravada.saidos} saíram · {gravada.voltaram} voltaram</small>
              </li>
              <li>
                <ClipboardList aria-hidden size={18} /> <strong>{gravada.ncs}</strong> NCs
                <small>{gravada.ncsNovas} novas · {gravada.ncsMudaram} mudaram de situação</small>
              </li>
            </ul>
            <Link href="/" className="botao destaque">
              <KanbanSquare aria-hidden size={16} /> Ver o kanban
            </Link>
          </div>
        )}
        {resumos && (
          <p className="aviso andamento">
            <Sparkles aria-hidden size={16} /> {resumos}
          </p>
        )}
      </div>
      {erro && <p role="alert" className="erro">{erro}</p>}
    </section>
  );
}
