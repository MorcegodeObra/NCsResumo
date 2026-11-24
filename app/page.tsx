"use client";
import { useEffect, useState } from "react";
import Entrar from "@/front/componentes/Entrar";
import Quadro from "@/front/componentes/Quadro";
import { papel as lerPapel, quandoSessaoExpirar } from "@/front/lib/api";
import type { Papel } from "@/compartilhado/dominio/tipos";

export default function Pagina() {
  // undefined = ainda verificando a sessão; null = sem sessão.
  const [papel, setPapel] = useState<Papel | null | undefined>(undefined);

  useEffect(() => {
    quandoSessaoExpirar(() => setPapel(null));
    lerPapel().then(setPapel, () => setPapel(null));
    return () => quandoSessaoExpirar(null);
  }, []);

  return (
    <main>
      <h1>Resumo de NCs</h1>
      {papel === undefined ? (
        <p className="cinza">Carregando…</p>
      ) : papel === null ? (
        <Entrar onEntrou={setPapel} />
      ) : (
        <Quadro papel={papel} />
      )}
    </main>
  );
}
