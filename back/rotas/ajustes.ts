import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta, lerCorpo } from "@/back/servidor/http";
import { ajustar } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { ajustes, autor, codigoDaRota } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function PUT(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "equipe");
    const codigo = await codigoDaRota(ctx);
    const corpo = await lerCorpo(req);
    return NextResponse.json({ pacote: await ajustar(banco(), codigo, autor(corpo?.autor), ajustes(corpo)) });
  } catch (e) {
    return erroResposta(e);
  }
}
