"use client";
import { useState } from "react";
import { entrar } from "@/lib/api";
import { guardarNome, lerNome } from "@/lib/nome";
import type { Papel } from "@/lib/dominio/tipos";

export default function Entrar({ onEntrou }: { onEntrou: (papel: Papel) => void }) {
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState(lerNome);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) return setErro("Informe o seu nome: ele aparece no histórico das mudanças.");
    setEnviando(true);
    try {
      const papel = await entrar(senha);
      guardarNome(nome);
      onEntrou(papel);
    } catch (x) {
      setErro(x instanceof Error ? x.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="entrar" onSubmit={enviar}>
      <label htmlFor="senha">Senha</label>
      <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
      <label htmlFor="nome">Seu nome</label>
      <input id="nome" type="text" autoComplete="name" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
      {erro && <p role="alert" className="erro">{erro}</p>}
      <button type="submit" disabled={enviando}>Entrar</button>
    </form>
  );
}
