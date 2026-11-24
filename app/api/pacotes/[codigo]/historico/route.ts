import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/lib/servidor/banco";
import { erroResposta } from "@/lib/servidor/http";
import { historico } from "@/lib/servidor/repositorio";
import { exigirPapel } from "@/lib/servidor/sessao";
import { codigoDaRota } from "@/lib/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function GET(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "equipe");
    return NextResponse.json({ eventos: await historico(banco(), await codigoDaRota(ctx)) });
  } catch (e) {
    return erroResposta(e);
  }
}
