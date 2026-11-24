// Nome que a pessoa da equipe informou; vai para o histórico (não é conferido pelo servidor).
const CHAVE = "nc-nome";
export const lerNome = () => (typeof localStorage === "undefined" ? "" : (localStorage.getItem(CHAVE) ?? ""));
export const guardarNome = (nome: string) => localStorage.setItem(CHAVE, nome.trim());
export const apagarNome = () => localStorage.removeItem(CHAVE);

/** Nome guardado; se não houver, pergunta e guarda. Lança erro se a pessoa não informar. */
export function exigirNome(): string {
  if (!lerNome()) guardarNome((window.prompt("Qual é o seu nome? Ele aparece no histórico das mudanças.") ?? "").slice(0, 60));
  const nome = lerNome();
  if (!nome) throw new Error("Informe o seu nome: ele aparece no histórico das mudanças.");
  return nome;
}
