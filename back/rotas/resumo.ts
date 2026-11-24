import { NextRequest, NextResponse } from "next/server";
import { assinatura } from "@/back/dominio/assinatura";
import type { LinhaCard } from "@/compartilhado/dominio/tipos";
import { banco } from "@/back/servidor/banco";
import { erroResposta } from "@/back/servidor/http";
import { ErroIA, gerarResumo } from "@/back/servidor/ia";
import { buscarPacote, salvarResumo } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { codigoDaRota } from "@/back/servidor/validar";

type Contexto = { params: Promise<{ codigo: string }> };

export async function POST(req: NextRequest, ctx: Contexto) {
  try {
    exigirPapel(req, "dono");
    const codigo = await codigoDaRota(ctx);
    const pacote = await buscarPacote(banco(), codigo);
    let linhas: LinhaCard[];
    try {
      linhas = await gerarResumo(pacote.tarefa, pacote.ncs);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ pacote, aviso: `${e instanceof ErroIA ? e.message : "A IA falhou."} O card não mudou.` });
    }
    // A assinatura é das NCs enviadas à IA: se uma importação mudar o pacote no meio, o resumo já nasce inválido.
    return NextResponse.json({ pacote: await salvarResumo(banco(), codigo, linhas, assinatura(pacote.ncs)) });
  } catch (e) {
    return erroResposta(e);
  }
}
