import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/lib/servidor/banco";
import { erroResposta, lerCorpo } from "@/lib/servidor/http";
import { desmarcar, marcar } from "@/lib/servidor/repositorio";
import { exigirPapel } from "@/lib/servidor/sessao";
import { autor, codigoDaRota, listaIds } from "@/lib/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function POST(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "equipe");
    const codigo = await codigoDaRota(ctx);
    const corpo = await lerCorpo(req);
    return NextResponse.json({ pacote: await marcar(banco(), codigo, autor(corpo?.autor), listaIds(corpo?.ncs)) });
  } catch (e) {
    return erroResposta(e);
  }
}

export async function DELETE(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "equipe");
    const codigo = await codigoDaRota(ctx);
    const corpo = await lerCorpo(req);
    return NextResponse.json({ pacote: await desmarcar(banco(), codigo, autor(corpo?.autor), listaIds(corpo?.ncs)) });
  } catch (e) {
    return erroResposta(e);
  }
}
