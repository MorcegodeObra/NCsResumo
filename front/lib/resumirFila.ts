import type { PacoteVisao } from "@/compartilhado/dominio/tipos";
import { resumir } from "./api";

const MAX_FALHAS_SEGUIDAS = 3;

/** Resume um pacote por vez (limite da IA); quem já tem resumo válido ou está em Concluído fica de fora. Devolve o resultado em texto. */
export async function resumirFila(pacotes: PacoteVisao[], onProgresso: (texto: string) => void, onPacote: (p: PacoteVisao) => void): Promise<string> {
  const fila = pacotes.filter((p) => p.coluna !== "concluido" && !p.resumoIA);
  if (!fila.length) return "Todos os cards já têm o resumo da IA.";
  let feitos = 0;
  let falhas = 0;
  let ultimoAviso = "";
  for (const [i, p] of fila.entries()) {
    onProgresso(`Resumindo com IA: ${i + 1} de ${fila.length}…`);
    let resumido = false;
    try {
      const { pacote, aviso } = await resumir(p.codigo);
      onPacote(pacote);
      resumido = pacote.resumoIA && !aviso;
      if (aviso) ultimoAviso = aviso;
    } catch (e) {
      ultimoAviso = e instanceof Error ? e.message : "Não foi possível gerar o resumo.";
    }
    if (resumido) feitos++;
    falhas = resumido ? 0 : falhas + 1;
    if (falhas === MAX_FALHAS_SEGUIDAS) break;
  }
  const locais = fila.length - feitos;
  return (
    `${feitos} de ${fila.length} pacotes resumidos` +
    (locais ? `; ${locais} ${locais === 1 ? "ficou" : "ficaram"} com o resumo local.` : ".") +
    (ultimoAviso ? ` Último aviso: ${ultimoAviso}` : "")
  );
}
