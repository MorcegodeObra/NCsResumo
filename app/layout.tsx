import type { Metadata, Viewport } from "next";
import Moldura from "@/front/componentes/Moldura";
import "@/front/estilos/globals.css";

export const metadata: Metadata = {
  title: "Resumo de NCs",
  description: "Resumo das não conformidades das fichas FVS e de fiscalização",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Moldura>{children}</Moldura>
      </body>
    </html>
  );
}
