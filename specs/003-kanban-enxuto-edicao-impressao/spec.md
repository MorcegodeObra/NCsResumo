# Spec 003: kanban enxuto, card que abre, edição e impressão

**Data**: 2026-11-24 | **Pedido e decisões**: dono do projeto

## Requisitos

- **R1 Kanban**: o card tem só o local e o serviço, com **Mover para Corrigido** e **Abrir card**. Concluído
  continua vindo só da planilha. Marcar NC por NC fica no card aberto, em `/cards`.
- **R2 Cards**: na tela, o card fechado tem tamanho fixo; **Abrir** mostra o card na íntegra, com as ações.
  O **Abrir card** do kanban já chega com o card aberto.
- **R3 Edição** (equipe e dono): empresa, serviço, bloco, pavimento e prazo do pacote; descrição e local de
  cada NC. Cada mudança vai para o histórico com o antes e o depois. A importação nunca desfaz a edição.
  Vazio volta ao valor da planilha. Mudar NC invalida o resumo da IA (a assinatura já cobre o texto).
- **R4 Impressão**: só Aberto e Corrigido, na íntegra, sem botões nem menus, em duas colunas na A4. O card
  não é cortado entre colunas ou páginas, a não ser que seja maior que a página.

## Contratos que mudam

- **API**: entra `PUT /api/pacotes/:codigo/ajustes` (equipe), corpo
  `{ autor, pacote?: { equipes?, tarefa?, bloco?, pavimento?, prazo? }, ncs?: [{ id, descricao?, sublocal? }] }`,
  só com o que mudou. 200 `{ pacote }`; 400 inválido; 404 pacote ou NC que não é dele.
- **Banco**: `pacotes.ajustes` e `ncs.ajustes`, `jsonb NOT NULL DEFAULT '{}'`.
- **Eventos**: `pacote_editado` e `nc_editada`, detalhe `{ campo, antes, depois }`.

## Plano e Constitution Check

Sem dependência nova. Sai do navegador, a mais: os textos editados e o nome de quem editou, necessários para
guardá-los. Para a IA vão os mesmos campos, com o texto editado. O Princípio V exige a emenda 1.3.0 (edição).
