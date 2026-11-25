import PaginaFicha from "@/front/componentes/PaginaFicha";

export default async function Pagina({ params }: { params: Promise<{ codigo: string }> }) {
  return <PaginaFicha codigo={(await params).codigo} />;
}
