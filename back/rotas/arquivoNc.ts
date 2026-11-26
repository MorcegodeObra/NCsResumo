import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta } from "@/back/servidor/http";
import { arquivarNc, desarquivarNc } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { codigoDaRota, idNcDaRota } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string; id: string }> };

const rota = (acao: typeof arquivarNc) => async (req: NextRequest, ctx: Contexto) => {
  try {
    exigirPapel(req, "dono");
    return NextResponse.json({ pacote: await acao(banco(), await codigoDaRota(ctx), await idNcDaRota(ctx)) });
  } catch (e) {
    return erroResposta(e);
  }
};

export const POST = rota(arquivarNc);
export const DELETE = rota(desarquivarNc);
