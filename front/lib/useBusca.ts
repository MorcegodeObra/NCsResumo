import { useState } from "react";

/** Busca guardada no aparelho, uma por tela (specs/006 R3). */
export function useBusca(tela: string) {
  const chave = `nc-busca-${tela}`;
  // As telas só montam no navegador (a Moldura espera a sessão), mas o guarda evita erro se um dia montarem no servidor.
  const [busca, setBusca] = useState(() => (typeof localStorage === "undefined" ? "" : (localStorage.getItem(chave) ?? "")));
  function mudar(b: string) {
    localStorage.setItem(chave, b);
    setBusca(b);
  }
  return [busca, mudar] as const;
}
