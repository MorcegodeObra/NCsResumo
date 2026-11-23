// Planilha de inspeções ANONIMIZADA (Princípio III): empresas, pessoas e CNPJs são fictícios.
// Reproduz os casos reais da exportação "Base de Dados de Inspeções" (ver contracts/planilha.md).
import * as XLSX from "xlsx";

export const COLUNAS = [
  "Nº Inspeção", "Código Pacote", "N° da Predecessão", "Tarefa", "Etapa", "Endereço", "Local",
  "Sublocal", "% Acumulado", "Status", "Situação do Pacote", "Identificador Vínculo Ficha",
  "Descrição FVS", "Agrupamento de FVS", "Situação FVS", "Identificador Vínculo Item",
  "Descrição Item Inspeção", "Situação do Item", "Identificador Histórico Item", "Data Inspeção",
  "Usuário Inspeção", "Identificador Vínculo Problema", "Tipo de Não Conformidade",
  "Descrição Problema", "Ações Tomadas", "Data Prevista Correção", "Data Real Correção",
  "Equipe(s)", "Colaborador NC",
] as const;

export type Coluna = (typeof COLUNAS)[number];
export type Linha = Partial<Record<Coluna, string>>;

const FISC = "2767 - FISCALIZAÇÃO 05.02 - Alvenaria Estrutural - Elevação [PAVIMENTO]";
const FVS = "2756 - FVS 05.02 - Alvenaria Estrutural - Elevação";
const PESSOAS = { "Usuário Inspeção": "900 - INSPETOR FICTICIO", "Colaborador NC": "COLABORADOR FICTICIO" };
const TIPO = "Serviço: Não atendimento ao procedimento executivo";

// Pacote 100001: alvenaria, 3º pav, NCs de fiscalização abertas e FVS aberta (que fica escondida).
const p1: Linha = {
  "Nº Inspeção": "50001", "Código Pacote": "100001",
  Tarefa: "4828 - SERVIÇO DE EXECUÇÃO DE ALVENARIA - 15CM PAVTO TIPO - BLOCO PADRÃO NOVO COM CHURRASQUEIRA (INCLUSO VERGAS)",
  Etapa: "Bloco 1", Endereço: "3 º Pavimento - 3", Local: "3 º Pavimento - 3",
  "Situação do Pacote": "REPROVADA", "Equipe(s)": "7001-ALFA", ...PESSOAS,
};
// Pacote 100002: alvenaria térreo, só FVS, duas empresas e casos de situação.
const p2: Linha = {
  "Nº Inspeção": "50002", "Código Pacote": "100002",
  Tarefa: "4813 - SERVIÇO DE EXECUÇÃO DE ALVENARIA - 15CM TÉRREO - BLOCO PADRÃO NOVO (INCLUSO VERGAS)",
  Etapa: "Bloco 2", Endereço: "PAVIMENTO TÉRREO - 1", Local: "PAVIMENTO TÉRREO - 1",
  "Situação do Pacote": "REPROVADA", "Equipe(s)": "7002-BETA ,7003-BETA,7004-GAMA", ...PESSOAS,
};

const nc = (base: Linha, x: Linha): Linha => ({ ...base, "Tipo de Não Conformidade": TIPO, ...x });

export const LINHAS: Linha[] = [
  // --- 100001, fiscalização ---
  // NC 9001 com 3 reinspeções; continua REPROVADA.
  nc(p1, { "Descrição FVS": FISC, "Identificador Vínculo Item": "8001", "Descrição Item Inspeção": "364 - Esquadro entre alvenarias", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7001", "Data Inspeção": "01/10/2026 08:00:00", "Identificador Vínculo Problema": "9001", "Descrição Problema": "esquadro incompatível", Sublocal: "BL 1 - 3° PAV - AP 01 95%", "Data Prevista Correção": "21/10/2026 00:00:00" }),
  nc(p1, { "Descrição FVS": FISC, "Identificador Vínculo Item": "8001", "Descrição Item Inspeção": "364 - Esquadro entre alvenarias", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7002", "Data Inspeção": "05/10/2026 08:00:00", "Identificador Vínculo Problema": "9001", "Descrição Problema": "esquadro incompatível", Sublocal: "BL 1 - 3° PAV - AP 01 95%", "Data Prevista Correção": "21/10/2026 00:00:00" }),
  nc(p1, { "Descrição FVS": FISC, "Identificador Vínculo Item": "8001", "Descrição Item Inspeção": "364 - Esquadro entre alvenarias", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7003", "Data Inspeção": "10/10/2026 08:00:00", "Identificador Vínculo Problema": "9001", "Descrição Problema": "esquadro incompatível", Sublocal: "BL 1 - 3° PAV - AP 01 95%", "Data Prevista Correção": "21/10/2026 00:00:00" }),
  nc(p1, { "Descrição FVS": FISC, "Identificador Vínculo Item": "8002", "Descrição Item Inspeção": "364 - Esquadro entre alvenarias", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7004", "Data Inspeção": "10/10/2026 09:00:00", "Identificador Vínculo Problema": "9002", "Descrição Problema": "esquadro de paredes", Sublocal: "BL 1 - 3° PAV - AP 02", "Data Prevista Correção": "25/10/2026 00:00:00" }),
  nc(p1, { "Descrição FVS": FISC, "Identificador Vínculo Item": "8003", "Descrição Item Inspeção": "364 - Esquadro entre alvenarias", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7005", "Data Inspeção": "10/10/2026 09:10:00", "Identificador Vínculo Problema": "9003", "Descrição Problema": "esquadro", Sublocal: "BL 1 - 3° PAV - HALL A", "Data Prevista Correção": "25/10/2026 00:00:00" }),
  nc(p1, { "Descrição FVS": FISC, "Identificador Vínculo Item": "8004", "Descrição Item Inspeção": "364 - Esquadro entre alvenarias", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7006", "Data Inspeção": "10/10/2026 09:20:00", "Identificador Vínculo Problema": "9004", "Descrição Problema": "esquadro", Sublocal: "hall b", "Data Prevista Correção": "25/10/2026 00:00:00" }),
  nc(p1, { "Descrição FVS": FISC, "Identificador Vínculo Item": "8005", "Descrição Item Inspeção": "365 - Planicidade", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7007", "Data Inspeção": "10/10/2026 09:30:00", "Identificador Vínculo Problema": "9005", "Descrição Problema": "parede fora de plano", Sublocal: "BL 1 - 3° PAV - AP 08_ 95%", "Data Prevista Correção": "" }),
  // Fiscalização já aprovada (concluída): não aparece.
  nc(p1, { "Descrição FVS": FISC, "Identificador Vínculo Item": "8006", "Descrição Item Inspeção": "366 - Amarrações/Modulação", "Situação do Item": "APROVADO APÓS INSPECAO", "Identificador Histórico Item": "7008", "Data Inspeção": "12/10/2026 10:00:00", "Identificador Vínculo Problema": "9006", "Descrição Problema": "amarração", Sublocal: "BL 1 - 3° PAV - AP 03" }),
  // FVS aberta do mesmo pacote: escondida porque há fiscalização não concluída.
  nc(p1, { "Descrição FVS": FVS, "Identificador Vínculo Item": "8007", "Descrição Item Inspeção": "362 - Juntas (argamassa) Verticais e Horizontais", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7009", "Data Inspeção": "02/10/2026 10:00:00", "Identificador Vínculo Problema": "9007", "Descrição Problema": "junta falhada", Sublocal: "BL 1 - 3° PAV - AP 04", "Data Prevista Correção": "15/10/2026 00:00:00" }),
  // Item aprovado sem NC (não gera NC).
  { ...p1, "Descrição FVS": FISC, "Identificador Vínculo Item": "8008", "Descrição Item Inspeção": "375 - Integridade", "Situação do Item": "APROVADA", "Identificador Histórico Item": "7010", "Data Inspeção": "10/10/2026 11:00:00" },

  // --- 100002, só FVS ---
  // NC com Data Real Correção e item ainda REPROVADA: Corrigida.
  nc(p2, { "Descrição FVS": FVS, "Identificador Vínculo Item": "8101", "Descrição Item Inspeção": "364 - Esquadro entre alvenarias", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7101", "Data Inspeção": "03/10/2026 08:00:00", "Identificador Vínculo Problema": "9101", "Descrição Problema": "esquadro", Sublocal: "Apto 4", "Data Prevista Correção": "20/10/2026 00:00:00", "Data Real Correção": "18/10/2026 00:00:00" }),
  // NC aberta com sublocal ".".
  nc(p2, { "Descrição FVS": FVS, "Identificador Vínculo Item": "8102", "Descrição Item Inspeção": "5 - Limpeza Final", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7102", "Data Inspeção": "03/10/2026 08:10:00", "Identificador Vínculo Problema": "9102", "Descrição Problema": "entulho", Sublocal: ".", "Data Prevista Correção": "19/10/2026 00:00:00" }),
  // NC aberta com sublocal vazio e outra com "AP03", mesmo item (sem diferenciar acento/caixa).
  nc(p2, { "Descrição FVS": FVS, "Identificador Vínculo Item": "8103", "Descrição Item Inspeção": "5 - LIMPEZA FINAL", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7103", "Data Inspeção": "03/10/2026 08:20:00", "Identificador Vínculo Problema": "9103", "Descrição Problema": "entulho", Sublocal: "", "Data Prevista Correção": "22/10/2026 00:00:00" }),
  nc(p2, { "Descrição FVS": FVS, "Identificador Vínculo Item": "8104", "Descrição Item Inspeção": "5 - Limpeza Final", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7104", "Data Inspeção": "03/10/2026 08:30:00", "Identificador Vínculo Problema": "9104", "Descrição Problema": "entulho", Sublocal: "AP03", "Data Prevista Correção": "22/10/2026 00:00:00" }),
  // NC reprovada, depois o item é aprovado numa linha SEM NC: Concluída.
  nc(p2, { "Descrição FVS": FVS, "Identificador Vínculo Item": "8105", "Descrição Item Inspeção": "371 - Largura das Janelas conforme projeto", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7105", "Data Inspeção": "03/10/2026 09:00:00", "Identificador Vínculo Problema": "9105", "Descrição Problema": "janela estreita", Sublocal: "Apartamento 2", "Data Prevista Correção": "10/10/2026 00:00:00" }),
  { ...p2, "Descrição FVS": FVS, "Identificador Vínculo Item": "8105", "Descrição Item Inspeção": "371 - Largura das Janelas conforme projeto", "Situação do Item": "APROVADO APÓS INSPECAO", "Identificador Histórico Item": "7106", "Data Inspeção": "15/10/2026 09:00:00" },
  // NC cujo item termina em NÃO SE APLICA: Concluída.
  nc(p2, { "Descrição FVS": FVS, "Identificador Vínculo Item": "8106", "Descrição Item Inspeção": "378 - Altura do passa prato", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7107", "Data Inspeção": "03/10/2026 09:30:00", "Identificador Vínculo Problema": "9106", "Descrição Problema": "passa prato baixo", Sublocal: "AP 05" }),
  { ...p2, "Descrição FVS": FVS, "Identificador Vínculo Item": "8106", "Descrição Item Inspeção": "378 - Altura do passa prato", "Situação do Item": "NÃO SE APLICA", "Identificador Histórico Item": "7108", "Data Inspeção": "16/10/2026 09:30:00" },
  // Empate na Data Inspeção: vence o maior Identificador Histórico Item (aprovado).
  nc(p2, { "Descrição FVS": FVS, "Identificador Vínculo Item": "8107", "Descrição Item Inspeção": "419 - Dimensão interna dos Ambientes", "Situação do Item": "REPROVADA", "Identificador Histórico Item": "7109", "Data Inspeção": "17/10/2026 10:00:00", "Identificador Vínculo Problema": "9107", "Descrição Problema": "ambiente menor", Sublocal: "AP 06" }),
  { ...p2, "Descrição FVS": FVS, "Identificador Vínculo Item": "8107", "Descrição Item Inspeção": "419 - Dimensão interna dos Ambientes", "Situação do Item": "APROVADA", "Identificador Histórico Item": "7110", "Data Inspeção": "17/10/2026 10:00:00" },
  // Item nunca inspecionado (sem Data Inspeção): não muda nada.
  { ...p2, "Descrição FVS": FVS, "Identificador Vínculo Item": "8101", "Descrição Item Inspeção": "364 - Esquadro entre alvenarias", "Situação do Item": "" },

  // Rodapé da exportação.
  { "Nº Inspeção": "23/11/2026 14:26:40", "Código Pacote": "MENTOR CONSTRUÇÃO / PLANEJE TECNOLOGIA" },
];

/** Monta o .xlsx na memória, como a exportação: linha 1 vazia e cabeçalho na linha 2. */
export function gerarXlsx(
  linhas: Linha[] = LINHAS,
  opcoes: { colunas?: readonly string[]; aba?: string } = {},
): ArrayBuffer {
  const colunas = opcoes.colunas ?? COLUNAS;
  const aoa: string[][] = [[], [...colunas], ...linhas.map((l) => colunas.map((c) => (l as Record<string, string>)[c] ?? ""))];
  // Imita as ~524 mil linhas declaradas da exportação: linhas vazias no fim.
  for (let i = 0; i < 50; i++) aoa.push([]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), opcoes.aba ?? "Base de Dados de Inspeções");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
