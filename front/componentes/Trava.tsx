import { createPortal } from "react-dom";
import { LoaderCircle } from "lucide-react";

/** Tela meio opaca com um círculo girando enquanto uma gravação não termina (specs/006 R4). */
export default function Trava({ ativa }: { ativa: boolean }) {
  if (!ativa) return null;
  // No body: o card do kanban tem transform no hover, que prenderia o position:fixed dentro dele.
  return createPortal(
    <div className="trava no-print" role="status">
      <LoaderCircle aria-hidden size={40} className="girando" />
      <span>Gravando…</span>
    </div>,
    document.body,
  );
}
