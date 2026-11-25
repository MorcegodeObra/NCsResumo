import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta } from "@/back/servidor/http";
import { listarPacotes } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";

export async function GET(req: NextRequest) {
  try {
    const papel = exigirPapel(req, "equipe");
    const pacotes = await listarPacotes(banco());
    // A equipe só trabalha com Aberto e Corrigido (specs/004).
    return NextResponse.json({ pacotes: papel === "dono" ? pacotes : pacotes.filter((p) => p.coluna !== "concluido") });
  } catch (e) {
    return erroResposta(e);
  }
}
