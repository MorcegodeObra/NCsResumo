import "server-only";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { Papel } from "@/compartilhado/dominio/tipos";
import { ErroHttp } from "./http";

// Sessão em cookie assinado: "papel.expiração.assinatura" (research.md R4).
export const NOME_COOKIE = "sessao";
export const DURACAO_SESSAO_S = 12 * 3600;
export const opcoesCookie = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: DURACAO_SESSAO_S };

/** Falha fechada: configuração incompleta ou insegura recusa todo login. */
function configuracao() {
  const equipe = process.env.SENHA_EQUIPE ?? "";
  const dono = process.env.SENHA_DONO ?? "";
  const segredo = process.env.SEGREDO_SESSAO ?? "";
  if (!equipe || !dono || segredo.length < 32 || equipe === dono)
    throw new ErroHttp(500, "Acesso não configurado no servidor.");
  return { equipe, dono, segredo };
}

const iguais = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export function papelDaSenha(senha: unknown): Papel | null {
  const { equipe, dono } = configuracao();
  if (typeof senha !== "string" || !senha) return null;
  // Compara com as duas sempre, para o tempo não revelar qual bateu.
  const ehDono = iguais(senha, dono);
  const ehEquipe = iguais(senha, equipe);
  return ehDono ? "dono" : ehEquipe ? "equipe" : null;
}

const assinar = (dados: string, segredo: string) => createHmac("sha256", segredo).update(dados).digest("base64url");

export function criarCookie(papel: Papel, agora = Date.now()): string {
  const dados = `${papel}.${Math.floor(agora / 1000) + DURACAO_SESSAO_S}`;
  return `${dados}.${assinar(dados, configuracao().segredo)}`;
}

export function lerSessao(valor: string | undefined, agora = Date.now()): Papel | null {
  const partes = (valor ?? "").split(".");
  if (partes.length !== 3) return null;
  const [papel, exp, assinatura] = partes;
  if (papel !== "equipe" && papel !== "dono") return null;
  let segredo: string;
  try {
    segredo = configuracao().segredo;
  } catch {
    return null;
  }
  const esperada = assinar(`${papel}.${exp}`, segredo);
  if (assinatura.length !== esperada.length || !timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))) return null;
  if (!(Number(exp) * 1000 > agora)) return null;
  return papel;
}

/** 401 sem sessão; 403 se a rota é do dono e a sessão é da equipe. O dono passa em tudo. */
export function exigirPapel(req: NextRequest, papel: Papel): Papel {
  const atual = lerSessao(req.cookies.get(NOME_COOKIE)?.value);
  if (!atual) throw new ErroHttp(401, "Entre com a senha para continuar.");
  if (papel === "dono" && atual !== "dono") throw new ErroHttp(403, "Só o dono pode fazer isso.");
  return atual;
}
