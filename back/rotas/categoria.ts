import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta, lerCorpo } from "@/back/servidor/http";
import { definirCategoria } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { autor, categoria, codigoDaRota } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function PUT(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "equipe");
    const codigo = await codigoDaRota(ctx);
    const corpo = await lerCorpo(req);
    return NextResponse.json({ pacote: await definirCategoria(banco(), codigo, autor(corpo?.autor), categoria(corpo?.categoria)) });
  } catch (e) {
    return erroResposta(e);
  }
}
