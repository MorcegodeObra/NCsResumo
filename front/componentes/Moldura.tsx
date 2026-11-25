"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import Entrar from "./Entrar";
import { papel as lerPapel, quandoSessaoExpirar, sair } from "@/front/lib/api";
import { apagarNome, lerNome } from "@/front/lib/nome";
import type { Papel } from "@/compartilhado/dominio/tipos";

export const ContextoPapel = createContext<Papel>("equipe");
export const usePapel = () => useContext(ContextoPapel);

const NOME_PAPEL: Record<Papel, string> = { equipe: "Equipe", dono: "Dono" };
const PAGINAS: [href: string, nome: string, soDono?: boolean][] = [
  ["/", "Kanban"],
  ["/cards", "Cards"],
  ["/tabela", "Tabela", true],
  ["/importar", "Importar"],
];

/** Sessão, menu e Sair de todas as páginas; sem sessão, só o login. */
export default function Moldura({ children }: { children: React.ReactNode }) {
  // undefined = ainda verificando a sessão; null = sem sessão.
  const [papel, setPapel] = useState<Papel | null | undefined>(undefined);
  const [erro, setErro] = useState("");
  const atual = usePathname();

  useEffect(() => {
    quandoSessaoExpirar(() => setPapel(null));
    lerPapel().then(setPapel, () => setPapel(null));
    return () => quandoSessaoExpirar(null);
  }, []);

  async function encerrar() {
    setErro("");
    try {
      await sair();
      apagarNome();
      setPapel(null);
    } catch {
      setErro("Não foi possível sair. Tente de novo.");
    }
  }

  if (!papel)
    return (
      <main className="centro">
        <h1>Resumo de NCs</h1>
        {papel === undefined ? <p className="cinza">Carregando…</p> : <Entrar onEntrou={setPapel} />}
      </main>
    );
  return (
    <>
      <header className="topo no-print">
        <h1>Resumo de NCs</h1>
        <nav aria-label="Páginas">
          {PAGINAS.filter(([, , soDono]) => !soDono || papel === "dono").map(([href, nome]) => (
            <Link key={href} href={href} aria-current={atual === href ? "page" : undefined}>
              {nome}
            </Link>
          ))}
        </nav>
        <span className="quem">{[lerNome(), NOME_PAPEL[papel]].filter(Boolean).join(" · ")}</span>
        <button type="button" className="botao" onClick={encerrar}>
          Sair
        </button>
      </header>
      <main>
        {erro && <p role="alert" className="erro">{erro}</p>}
        <ContextoPapel value={papel}>{children}</ContextoPapel>
      </main>
    </>
  );
}
