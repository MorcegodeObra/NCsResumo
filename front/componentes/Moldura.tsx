"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Archive, FileUp, KanbanSquare, LayoutGrid, LogOut, PanelLeftClose, PanelLeftOpen, Table2, type LucideIcon } from "lucide-react";
import Entrar from "./Entrar";
import { papel as lerPapel, quandoSessaoExpirar, sair } from "@/front/lib/api";
import { apagarNome, lerNome } from "@/front/lib/nome";
import type { Papel } from "@/compartilhado/dominio/tipos";

export const ContextoPapel = createContext<Papel>("equipe");
export const usePapel = () => useContext(ContextoPapel);

const NOME_PAPEL: Record<Papel, string> = { equipe: "Equipe", dono: "Dono" };
const PAGINAS: [href: string, nome: string, icone: LucideIcon, soDono?: boolean][] = [
  ["/", "Kanban", KanbanSquare],
  ["/cards", "Cards", LayoutGrid],
  ["/tabela", "Tabela", Table2, true],
  ["/arquivo", "Arquivo", Archive, true],
  ["/importar", "Importar", FileUp],
];
const CHAVE_MENU = "nc-menu-recolhido";

/** Sessão, menu e Sair de todas as páginas; sem sessão, só o login. */
export default function Moldura({ children }: { children: React.ReactNode }) {
  // undefined = ainda verificando a sessão; null = sem sessão.
  const [papel, setPapel] = useState<Papel | null | undefined>(undefined);
  const [erro, setErro] = useState("");
  const atual = usePathname();
  const [recolhido, setRecolhido] = useState(false);

  useEffect(() => {
    quandoSessaoExpirar(() => setPapel(null));
    lerPapel().then(setPapel, () => setPapel(null));
    setRecolhido(localStorage.getItem(CHAVE_MENU) === "1"); // depois da hidratação, para o HTML do servidor bater
    return () => quandoSessaoExpirar(null);
  }, []);

  function alternarMenu() {
    localStorage.setItem(CHAVE_MENU, recolhido ? "0" : "1");
    setRecolhido(!recolhido);
  }

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
    <div className={`app${recolhido ? " recolhido" : ""}`}>
      {/* No PC, menu lateral que recolhe; no celular, barra fixa embaixo (só CSS). */}
      <aside className="menu no-print">
        <div className="marca">
          <button type="button" className="alternar" aria-expanded={!recolhido} aria-controls="menu-paginas" onClick={alternarMenu}
            aria-label={recolhido ? "Abrir o menu" : "Recolher o menu"} title={recolhido ? "Abrir o menu" : "Recolher o menu"}>
            {recolhido ? <PanelLeftOpen aria-hidden size={20} /> : <PanelLeftClose aria-hidden size={20} />}
          </button>
          <h1>Resumo de NCs</h1>
        </div>
        <nav id="menu-paginas" aria-label="Páginas">
          {PAGINAS.filter(([, , , soDono]) => !soDono || papel === "dono").map(([href, nome, Icone]) => (
            <Link key={href} href={href} aria-current={atual === href ? "page" : undefined} title={nome}>
              <Icone aria-hidden size={20} />
              <span className="rotulo">{nome}</span>
            </Link>
          ))}
          <button type="button" className="sair" onClick={encerrar} title="Sair">
            <LogOut aria-hidden size={20} />
            <span className="rotulo">Sair</span>
          </button>
        </nav>
        <span className="quem">{[lerNome(), NOME_PAPEL[papel]].filter(Boolean).join(" · ")}</span>
      </aside>
      <main>
        {erro && <p role="alert" className="erro">{erro}</p>}
        <ContextoPapel value={papel}>{children}</ContextoPapel>
      </main>
    </div>
  );
}
