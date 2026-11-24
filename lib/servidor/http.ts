import { NextResponse } from "next/server";

/** Erro com status HTTP, para recusar entrada ou acesso (contracts/api.md). */
export class ErroHttp extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export const respostaErro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });

export function erroResposta(e: unknown) {
  if (e instanceof ErroHttp) return respostaErro(e.status, e.message);
  console.error(e);
  return respostaErro(500, "Erro inesperado no servidor.");
}

/** Corpo JSON limitado em tamanho: 413 acima do limite, 400 se não for JSON. */
export async function lerCorpo(req: Request, limite = 200_000, mensagem = "O corpo passa do limite de tamanho."): Promise<any> {
  if (Number(req.headers.get("content-length") ?? 0) > limite) throw new ErroHttp(413, mensagem);
  const texto = await req.text();
  if (Buffer.byteLength(texto) > limite) throw new ErroHttp(413, mensagem);
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErroHttp(400, "Corpo inválido.");
  }
}
