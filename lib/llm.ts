import { NextRequest, NextResponse } from "next/server";

// Qualquer API compatível com OpenAI funciona (Groq por padrão; também Gemini, OpenAI, OpenRouter).
const BASE = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
const MODELO = process.env.LLM_MODEL || "openai/gpt-oss-120b";

/** Se SITE_PASSWORD estiver definida, exige o cabeçalho x-senha igual a ela. */
export function checarSenha(req: NextRequest): NextResponse | null {
  const senha = process.env.SITE_PASSWORD;
  if (!senha) return null;
  if (req.headers.get("x-senha") === senha) return null;
  return NextResponse.json({ erro: "Senha incorreta ou ausente." }, { status: 401 });
}

export async function perguntarLLM(system: string, usuario: string, maxTokens = 1500): Promise<string> {
  const chave = process.env.LLM_API_KEY;
  if (!chave) throw new Error("LLM_API_KEY não está configurada no servidor.");
  const corpo: Record<string, unknown> = {
    model: MODELO,
    max_tokens: maxTokens,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: usuario },
    ],
  };
  if (MODELO.includes("gpt-oss")) corpo.reasoning_effort = "low";
  const resp = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
    body: JSON.stringify(corpo),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Falha na API de IA (${resp.status}). ${txt.slice(0, 200)}`);
  }
  const data: any = await resp.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

/** Extrai o primeiro objeto JSON de uma resposta (tolera ```json e texto em volta). */
export function lerJSON(texto: string): any {
  const i = texto.indexOf("{");
  const f = texto.lastIndexOf("}");
  if (i < 0 || f < i) throw new Error("A IA não devolveu JSON.");
  return JSON.parse(texto.slice(i, f + 1));
}

export const str = (v: unknown, max = 300): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export function erroResposta(e: unknown) {
  const msg = e instanceof Error ? e.message : "Erro inesperado.";
  return NextResponse.json({ erro: msg }, { status: 500 });
}
