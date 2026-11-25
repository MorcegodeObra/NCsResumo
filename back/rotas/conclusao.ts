import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta } from "@/back/servidor/http";
import { concluir, reabrir } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { codigoDaRota } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function POST(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "dono");
    return NextResponse.json({ pacote: await concluir(banco(), await codigoDaRota(ctx)) });
  } catch (e) {
    return erroResposta(e);
  }
}

export async function DELETE(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "dono");
    return NextResponse.json({ pacote: await reabrir(banco(), await codigoDaRota(ctx)) });
  } catch (e) {
    return erroResposta(e);
  }
}
