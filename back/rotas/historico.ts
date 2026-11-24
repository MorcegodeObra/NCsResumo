import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta } from "@/back/servidor/http";
import { historico } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { codigoDaRota } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function GET(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "equipe");
    return NextResponse.json({ eventos: await historico(banco(), await codigoDaRota(ctx)) });
  } catch (e) {
    return erroResposta(e);
  }
}
