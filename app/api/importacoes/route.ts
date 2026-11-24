import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/lib/servidor/banco";
import { erroResposta, lerCorpo } from "@/lib/servidor/http";
import { importar } from "@/lib/servidor/repositorio";
import { exigirPapel } from "@/lib/servidor/sessao";
import { autor, LIMITE_BYTES_IMPORTACAO, validarCargaImportacao } from "@/lib/servidor/validar";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    exigirPapel(req, "equipe");
    const corpo = await lerCorpo(req, LIMITE_BYTES_IMPORTACAO, "A importação passa de 3 MB.");
    const quem = autor(corpo?.autor);
    const contagens = await importar(banco(), quem, validarCargaImportacao(corpo));
    return NextResponse.json({ contagens });
  } catch (e) {
    return erroResposta(e);
  }
}
