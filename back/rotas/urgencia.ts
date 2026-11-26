import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { ErroHttp, erroResposta, lerCorpo } from "@/back/servidor/http";
import { definirUrgencia } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { codigoDaRota } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function PUT(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "dono");
    const codigo = await codigoDaRota(ctx);
    const corpo = await lerCorpo(req);
    if (typeof corpo?.urgente !== "boolean") throw new ErroHttp(400, "Informe se o card é urgente.");
    return NextResponse.json({ pacote: await definirUrgencia(banco(), codigo, corpo.urgente) });
  } catch (e) {
    return erroResposta(e);
  }
}
