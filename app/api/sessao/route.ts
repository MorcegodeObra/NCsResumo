import { NextRequest, NextResponse } from "next/server";
import { ErroHttp, erroResposta } from "@/lib/servidor/http";
import { criarCookie, exigirPapel, NOME_COOKIE, opcoesCookie, papelDaSenha } from "@/lib/servidor/sessao";

export async function POST(req: NextRequest) {
  try {
    const corpo = await req.json().catch(() => {
      throw new ErroHttp(400, "Corpo inválido.");
    });
    const papel = papelDaSenha(corpo?.senha);
    if (!papel) throw new ErroHttp(401, "Senha incorreta.");
    const r = NextResponse.json({ papel });
    r.cookies.set(NOME_COOKIE, criarCookie(papel), opcoesCookie);
    return r;
  } catch (e) {
    return erroResposta(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ papel: exigirPapel(req, "equipe") });
  } catch (e) {
    return erroResposta(e);
  }
}

export async function DELETE() {
  const r = NextResponse.json({ ok: true });
  r.cookies.set(NOME_COOKIE, "", { ...opcoesCookie, maxAge: 0 });
  return r;
}
