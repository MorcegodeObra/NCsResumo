import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta, lerCorpo } from "@/back/servidor/http";
import { desmarcar, marcar } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { autor, codigoDaRota, listaIds } from "@/back/servidor/validar";

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
