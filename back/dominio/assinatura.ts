// Assinatura das NCs que o resumo da IA cobre (data-model.md). Só o servidor usa: depende de node:crypto.
import { createHash } from "node:crypto";

export const assinatura = (ncs: { id: string; item: string; descricao: string; sublocal: string }[]): string =>
  createHash("sha256")
    .update(ncs.map((n) => `${n.id}|${n.item}|${n.descricao}|${n.sublocal}`).sort().join("\n"))
    .digest("hex");
