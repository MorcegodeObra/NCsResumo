import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta, lerCorpo } from "@/back/servidor/http";
import { comentar } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { autor, codigoDaRota, textoComentario } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function POST(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "equipe");
    const codigo = await codigoDaRota(ctx);
    const corpo = await lerCorpo(req);
    return NextResponse.json({ pacote: await comentar(banco(), codigo, autor(corpo?.autor), textoComentario(corpo?.texto)) });
  } catch (e) {
    return erroResposta(e);
  }
}
