import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta } from "@/back/servidor/http";
import { excluirPacote } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { codigoDaRota } from "@/back/servidor/validar";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ codigo: string }> }) {
  try {
    exigirPapel(req, "dono");
    await excluirPacote(banco(), await codigoDaRota(ctx));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroResposta(e);
  }
}
