import { useState } from "react";

/** Uma ação por vez; ignora o clique em vez de desabilitar, para o foco do teclado não se perder. */
export function useAcao() {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function fazer(acao: () => Promise<void>) {
    if (ocupado) return;
    setErro("");
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar.");
    } finally {
      setOcupado(false);
    }
  }
  return { ocupado, erro, setErro, fazer };
}
