// Papel da sessão para testar as páginas fora da Moldura.
import type { Papel } from "@/compartilhado/dominio/tipos";
import { ContextoPapel } from "@/front/componentes/Moldura";

export const SessaoTeste = ({ papel = "equipe", children }: { papel?: Papel; children: React.ReactNode }) => (
  <ContextoPapel value={papel}>{children}</ContextoPapel>
);
