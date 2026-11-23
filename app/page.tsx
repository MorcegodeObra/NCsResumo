"use client";
import { useEffect, useState } from "react";
import Entrar from "@/components/Entrar";
import { papel as lerPapel, quandoSessaoExpirar } from "@/lib/api";
import type { Papel } from "@/lib/dominio/tipos";

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
        <section data-testid="quadro">
          <p className="aviso">Em construção: a importação da planilha está chegando.</p>
        </section>
      )}
    </main>
  );
}
