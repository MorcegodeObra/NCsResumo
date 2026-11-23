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
