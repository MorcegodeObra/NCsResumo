import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/lib/servidor/banco";
import { erroResposta } from "@/lib/servidor/http";
import { listarPacotes } from "@/lib/servidor/repositorio";
import { exigirPapel } from "@/lib/servidor/sessao";

export async function GET(req: NextRequest) {
  try {
    exigirPapel(req, "equipe");
    return NextResponse.json({ pacotes: await listarPacotes(banco()) });
  } catch (e) {
    return erroResposta(e);
  }
}
