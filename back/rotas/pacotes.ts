import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta } from "@/back/servidor/http";
import { listarPacotes } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";

export async function GET(req: NextRequest) {
  try {
    exigirPapel(req, "equipe");
    return NextResponse.json({ pacotes: await listarPacotes(banco()) });
  } catch (e) {
    return erroResposta(e);
  }
}
