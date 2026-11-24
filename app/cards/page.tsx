import Cards from "@/front/componentes/Cards";

export default async function Pagina({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q : "";
  // key: o menu "Cards" a partir de /cards?q=… limpa a busca.
  return <Cards key={busca} busca={busca} />;
}
