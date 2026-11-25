# Spec 004: ficha em página própria, conclusão pelo dono, tabela e quadro

**Data**: 2026-11-25 | **Pedido e decisões**: dono do projeto, depois de testar a 003

## Requisitos

- **R1 Ficha**: **Abrir** leva a `/cards/:codigo`, uma página só daquele pacote, com todas as informações e ações.
- **R2 Conclusão**: o dono move de Corrigido para Concluído e desfaz; a equipe não. A conclusão cobre as NCs
  visíveis no momento e cai (com evento) quando aparece NC nova ou alguma fica aberta.
- **R3 Visão**: a equipe só recebe Aberto e Corrigido. Os concluídos saem de `/cards` para todos.
- **R4 Tabela**: `/tabela`, só para o dono, com abertos, corrigidos e concluídos.
- **R5 Quadro**: listas com rolagem própria; clicar abre, arrastar move. O botão continua, para teclado e celular.
- **R6 Busca**: todos os termos, em qualquer ordem e campo, inclusive local e tipo de cada NC.

## Contratos que mudam

- **API**: `POST` e `DELETE /api/pacotes/:codigo/conclusao` (dono): 200 `{ pacote }`; 404; 409 fora de Corrigido.
  `GET /api/pacotes` omite os concluídos para a equipe. `PacoteVisao` ganha `concluidoEm`.
- **Banco**: `pacotes.concluido_em` e `pacotes.concluido_ncs`.
- **Eventos**: `pacote_concluido` e `pacote_reaberto`.

## Constitution Check

Sem dependência nova nem campo novo saindo do navegador. O Princípio V exige a emenda 1.4.0 (conclusão).
