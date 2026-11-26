// PacoteVisao pronto para os testes de componente.
import type { PacoteVisao } from "@/compartilhado/dominio/tipos";

export const pacoteVisao = (x: Partial<PacoteVisao> = {}): PacoteVisao => ({
  codigo: "100001",
  tarefa: "Alvenaria",
  bloco: "Bloco 1",
  pavimento: "3º PAV.",
  equipes: "ALFA",
  coluna: "aberto",
  origem: "fiscalizacao",
  prazo: "2026-10-21",
  saiuEm: null,
  concluidoEm: null,
  arquivadoEm: null,
  urgente: false,
  recenteEm: null,
  categoria: null,
  arquivadas: [],
  resumoIA: false,
  linhas: [
    { texto: "Esquadro entre alvenarias (AP 1-2, HALL A-B) ×2", ncs: ["9001", "9002"] },
    { texto: "Planicidade (AP 8)", ncs: ["9005"] },
  ],
  ncs: [
    { id: "9001", item: "Esquadro entre alvenarias", tipo: "Serviço: Não atendimento", descricao: "esquadro incompatível", sublocal: "AP 1", prazo: "2026-10-21", situacao: "aberta", marcadaPor: null, arquivadaEm: null },
    { id: "9002", item: "Esquadro entre alvenarias", tipo: "Serviço: Não atendimento", descricao: "esquadro de paredes", sublocal: "HALL A", prazo: "2026-10-25", situacao: "corrigida", marcadaPor: "Maria", arquivadaEm: null },
    { id: "9005", item: "Planicidade", tipo: "Serviço: Não atendimento", descricao: "parede fora de plano", sublocal: "AP 8", prazo: null, situacao: "aberta", marcadaPor: null, arquivadaEm: null },
  ],
  resolucao: "",
  ...x,
});
