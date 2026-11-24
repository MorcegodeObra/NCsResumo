import { NextRequest, NextResponse } from "next/server";
import { banco } from "@/back/servidor/banco";
import { erroResposta, lerCorpo } from "@/back/servidor/http";
import { importar } from "@/back/servidor/repositorio";
import { exigirPapel } from "@/back/servidor/sessao";
import { autor, LIMITE_BYTES_IMPORTACAO, validarCargaImportacao } from "@/back/servidor/validar";

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
