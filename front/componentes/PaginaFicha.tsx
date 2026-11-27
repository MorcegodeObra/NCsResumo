"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Ficha from "./Ficha";
import { usePapel } from "./Moldura";
import { usePacotes } from "@/front/lib/usePacotes";

export default function PaginaFicha({ codigo }: { codigo: string }) {
  const papel = usePapel();
  const { pacotes, erro, trocar, tirar } = usePacotes();
  const router = useRouter();
  const p = pacotes?.find((x) => x.codigo === codigo);
  // shortcut: history.length não diz se a página anterior é deste site; se a ficha vier de um link de fora, Voltar sai do site.
  const voltar = () => (history.length > 1 ? router.back() : router.push("/"));
  return (
    <>
      <p className="no-print">
        <button type="button" className="botao" onClick={voltar}>
          <ArrowLeft aria-hidden size={16} /> Voltar
        </button>
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
