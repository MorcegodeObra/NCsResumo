// Copia o worker do pdf.js para /public, de onde o navegador o carrega.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";

const origem = "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs";
if (!existsSync(origem)) {
  console.warn("[copiar-worker] worker do pdf.js não encontrado, pulando.");
  process.exit(0);
}
mkdirSync("public", { recursive: true });
copyFileSync(origem, "public/pdf.worker.min.mjs");
console.log("[copiar-worker] ok");
