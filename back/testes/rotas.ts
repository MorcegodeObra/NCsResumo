// Ajudantes para testar rotas: banco PGlite no lugar do de produção e cookie de sessão.
import { vi } from "vitest";
import { NextRequest } from "next/server";
import { gerarXlsx } from "@/compartilhado/testes/planilha";
import { lerPlanilha } from "@/front/planilha/ler";
import { importar as lerCarga } from "@/front/planilha/importar";
import type { Banco } from "@/back/servidor/banco";
import { bancoDeTeste } from "./banco";

export async function prepararRotas() {
  vi.stubEnv("SENHA_EQUIPE", "senha-equipe");
  vi.stubEnv("SENHA_DONO", "senha-dono");
  vi.stubEnv("SEGREDO_SESSAO", "s".repeat(40));
  const banco = await bancoDeTeste();
  const mod = await import("@/back/servidor/banco");
  vi.spyOn(mod, "banco").mockReturnValue(banco);
  return banco;
}

export async function cookie(papel: "equipe" | "dono") {
  const { criarCookie } = await import("@/back/servidor/sessao");
  return `sessao=${criarCookie(papel)}`;
}

export function requisicao(url: string, init: { method?: string; corpo?: unknown; texto?: string; cookie?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.cookie) headers.cookie = init.cookie;
  const body = init.texto ?? (init.corpo === undefined ? undefined : JSON.stringify(init.corpo));
  return new NextRequest(`http://localhost${url}`, { method: init.method ?? "GET", headers, body });
}

/** Segundo argumento das rotas dinâmicas /api/pacotes/[codigo]. */
export const contexto = (codigo: string) => ({ params: Promise.resolve({ codigo }) });

export async function importarFixture(banco: Banco) {
  const { importar } = await import("@/back/servidor/repositorio");
  await importar(banco, "Maria", lerCarga(lerPlanilha(gerarXlsx())));
}
