import type { PaginaPDF } from "./classify";

/** Lê o texto de um PDF no navegador (o arquivo não é enviado a nenhum servidor). */
export async function lerPDF(buffer: ArrayBuffer): Promise<PaginaPDF[]> {
  // import dinâmico: pdf.js só pode rodar no navegador
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const paginas: PaginaPDF[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const conteudo = await page.getTextContent();
    let texto = "";
    for (const item of conteudo.items as any[]) {
      if (typeof item.str !== "string") continue;
      texto += item.str + (item.hasEOL ? "\n" : " ");
    }
    paginas.push({ numero: n, texto });
  }
  await pdf.destroy();
  return paginas;
}
