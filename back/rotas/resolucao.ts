import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta, lerCorpo } from "@/back/servidor/http";
import { definirResolucao } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { codigoDaRota, textoResolucao } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function PUT(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "dono");
    const codigo = await codigoDaRota(ctx);
    const corpo = await lerCorpo(req);
    return NextResponse.json({ pacote: await definirResolucao(banco(), codigo, textoResolucao(corpo?.texto)) });
  } catch (e) {
    return erroResposta(e);
  }
}
