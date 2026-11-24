// Linhas da planilha → carga de importação (um registro por pacote e por NC), no navegador.
// Só saem os campos de plan.md "Dados que saem do navegador".
import * as n from "@/compartilhado/dominio/normalizar";
import type { CargaImportacao, NCImportada, PacoteImportado } from "@/compartilhado/dominio/tipos";
import type { LinhaPlanilha } from "./ler";

type Chave = [string, number]; // [Data Inspeção ISO, Identificador Histórico Item]
const maior = (a: Chave, b: Chave) => (a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1]);
const chave = (l: LinhaPlanilha): Chave | null => {
  const d = n.dataHora(l["Data Inspeção"]);
  return d ? [d, Number(n.texto(l["Identificador Histórico Item"])) || 0] : null;
};

export function importar(linhas: LinhaPlanilha[]): CargaImportacao {
  // Situação mais recente de cada item, contando as linhas sem NC.
  const ultimoItem = new Map<string, { k: Chave; situacao: string }>();
  // Linha mais recente de cada NC.
  const ultimaNC = new Map<string, { k: Chave | null; l: LinhaPlanilha }>();
  const pacotes = new Map<string, { l: LinhaPlanilha; equipes: string[] }>();

  for (const l of linhas) {
    const codigo = n.texto(l["Código Pacote"]);
    if (!pacotes.has(codigo)) pacotes.set(codigo, { l, equipes: [] });
    pacotes.get(codigo)!.equipes.push(l["Equipe(s)"]);

    const k = chave(l);
    const item = n.texto(l["Identificador Vínculo Item"]);
    if (k && item) {
      const atual = ultimoItem.get(item);
      if (!atual || maior(k, atual.k)) ultimoItem.set(item, { k, situacao: n.situacaoItem(l["Situação do Item"]) });
    }

    const id = n.texto(l["Identificador Vínculo Problema"]);
    if (id) {
      const atual = ultimaNC.get(id);
      if (!atual || (k && (!atual.k || !maior(atual.k, k)))) ultimaNC.set(id, { k, l });
    }
  }

  const listaPacotes: PacoteImportado[] = [...pacotes].map(([codigo, { l, equipes }]) => ({
    codigo,
    tarefa: n.servico(l["Tarefa"]),
    bloco: n.texto(l["Etapa"]),
    pavimento: n.pavimento(l["Local"]),
    equipes: n.empresa(equipes),
  }));

  const ncs: NCImportada[] = [...ultimaNC].map(([id, { l }]) => {
    const idItem = n.texto(l["Identificador Vínculo Item"]);
    const ult = ultimoItem.get(idItem);
    return {
      id,
      codigoPacote: n.texto(l["Código Pacote"]),
      idItem,
      item: n.item(l["Descrição Item Inspeção"]),
      origem: n.origem(l["Descrição FVS"]),
      tipo: n.texto(l["Tipo de Não Conformidade"]),
      descricao: n.texto(l["Descrição Problema"]),
      sublocal: n.sublocal(l["Sublocal"]),
      prazo: n.data(l["Data Prevista Correção"]),
      dataCorrecao: n.data(l["Data Real Correção"]),
      situacaoItem: ult?.situacao ?? n.situacaoItem(l["Situação do Item"]),
      ultimaInspecao: ult?.k[0] ?? null,
    };
  });

  return { pacotes: listaPacotes, ncs };
}
