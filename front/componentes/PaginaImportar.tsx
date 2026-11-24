"use client";
import Link from "next/link";
import { useState } from "react";
import Importar from "./Importar";
import { usePapel } from "./Moldura";
import { enviarImportacao, listarPacotes } from "@/front/lib/api";
import { exigirNome } from "@/front/lib/nome";
import { resumirFila } from "@/front/lib/resumirFila";
import type { CargaImportacao, Contagens } from "@/compartilhado/dominio/tipos";

const resumoContagens = (c: Contagens) =>
  `Importação gravada: ${c.pacotes} pacotes (${c.novos} novos, ${c.saidos} saíram, ${c.voltaram} voltaram), ` +
  `${c.ncs} NCs (${c.ncsNovas} novas, ${c.ncsMudaram} mudaram de situação).`;

export default function PaginaImportar() {
  const papel = usePapel();
  const [andamento, setAndamento] = useState("");
  const [gravada, setGravada] = useState("");
  const [resumos, setResumos] = useState("");
  const [erro, setErro] = useState("");

  async function importar(carga: CargaImportacao) {
    setErro("");
    setGravada("");
    setResumos("");
    setAndamento("Gravando a importação…");
    try {
      setGravada(resumoContagens(await enviarImportacao(exigirNome(), carga)));
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
        <li>Exporte do sistema de inspeção a planilha “Base de Dados de Inspeções” (.xlsx).</li>
        <li>Escolha o arquivo abaixo. Ele é lido no seu aparelho e não sai dele.</li>
        <li>Confira o resultado e veja o kanban.</li>
      </ol>
      <Importar onLido={importar} ocupado={!!andamento} />
      {andamento && <p className="cinza" aria-live="polite">{andamento}</p>}
      {gravada && (
        <p className="aviso" aria-live="polite">
          <span>{gravada}</span> <Link href="/">Ver o kanban</Link>
        </p>
      )}
      {resumos && <p className="aviso" aria-live="polite">{resumos}</p>}
      {erro && <p role="alert" className="erro">{erro}</p>}
    </section>
  );
}
