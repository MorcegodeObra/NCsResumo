import { useEffect, useState } from "react";
import type { PacoteVisao } from "@/compartilhado/dominio/tipos";
import { listarPacotes } from "./api";

/** Pacotes do servidor, com a troca local do que uma ação devolve. null = ainda carregando. */
export function usePacotes() {
  const [pacotes, setPacotes] = useState<PacoteVisao[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarPacotes().then(setPacotes, (e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar os pacotes."));
  }, []);

  const trocar = (novo: PacoteVisao) => setPacotes((ps) => ps && ps.map((p) => (p.codigo === novo.codigo ? novo : p)));
  const tirar = (codigo: string) => setPacotes((ps) => ps && ps.filter((p) => p.codigo !== codigo));
  return { pacotes, erro, trocar, tirar };
}
