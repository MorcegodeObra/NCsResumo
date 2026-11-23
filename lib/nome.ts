// Nome que a pessoa da equipe informou; vai para o histórico (não é conferido pelo servidor).
const CHAVE = "nc-nome";
export const lerNome = () => (typeof localStorage === "undefined" ? "" : (localStorage.getItem(CHAVE) ?? ""));
export const guardarNome = (nome: string) => localStorage.setItem(CHAVE, nome.trim());
