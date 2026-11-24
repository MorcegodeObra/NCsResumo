import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/lib/servidor/banco";
import { erroResposta } from "@/lib/servidor/http";
import { excluirPacote } from "@/lib/servidor/repositorio";
import { exigirPapel } from "@/lib/servidor/sessao";
import { codigoDaRota } from "@/lib/servidor/validar";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ codigo: string }> }) {
  try {
    exigirPapel(req, "dono");
    await excluirPacote(banco(), await codigoDaRota(ctx));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroResposta(e);
  }
}
