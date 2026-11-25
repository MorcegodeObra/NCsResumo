import type { Coluna, PacoteVisao, Papel } from "@/compartilhado/dominio/tipos";
import { idsAbertas } from "@/compartilhado/dominio/tipos";
import { concluir, marcar, reabrir } from "./api";
import { exigirNome } from "./nome";

export interface Movimento {
  destino: Coluna;
  nome: string;
  executar: () => Promise<PacoteVisao>;
}

/** O único passo que o papel pode dar com o pacote, se houver; vale para o botão e para o arrastar. */
export function movimento(p: PacoteVisao, papel: Papel): Movimento | null {
  if (p.coluna === "aberto")
    return { destino: "corrigido", nome: "Mover para Corrigido", executar: async () => marcar(p.codigo, exigirNome(), idsAbertas(p)) };
  if (papel !== "dono") return null;
  if (p.coluna === "corrigido") return { destino: "concluido", nome: "Mover para Concluído", executar: () => concluir(p.codigo) };
  // Concluído pela planilha não tem conclusão do dono para desfazer.
  if (p.concluidoEm && !p.saiuEm && p.ncs.length) return { destino: "corrigido", nome: "Voltar para Corrigido", executar: () => reabrir(p.codigo) };
  return null;
}
