"use client";
import Link from "next/link";
import Ficha from "./Ficha";
import { usePapel } from "./Moldura";
import { usePacotes } from "@/front/lib/usePacotes";

export default function PaginaFicha({ codigo }: { codigo: string }) {
  const papel = usePapel();
  const { pacotes, erro, trocar, tirar } = usePacotes();
  const p = pacotes?.find((x) => x.codigo === codigo);
  return (
    <>
      <p className="no-print">
        <Link href="/cards">← Voltar para os cards</Link>
      </p>
      {erro ? (
        <p role="alert" className="erro">{erro}</p>
      ) : !pacotes ? (
        <p className="cinza">Carregando a ficha…</p>
      ) : p ? (
        <Ficha p={p} papel={papel} onMudou={trocar} onExcluido={tirar} />
      ) : (
        <p>Esta ficha não está no quadro.</p>
      )}
    </>
  );
}
