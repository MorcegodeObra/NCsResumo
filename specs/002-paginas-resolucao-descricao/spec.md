# Spec 002: páginas, possível resolução, descrição no card e IA na importação

**Data**: 2026-11-24 | **Pedido e decisões**: dono do projeto

## Requisitos

- **R1 Sair**: toda página mostra o nome, o papel e o botão **Sair**, que apaga a sessão e o nome guardado no aparelho.
- **R2 Login**: centralizado na tela.
- **R3 Páginas**: `/` kanban (principal: marcar NCs, mover para Corrigido, abrir o card), `/cards`
  (busca, resolução, histórico, exportação, IA e exclusão) e `/importar` (passo a passo e resultado).
- **R4 Descrição**: a NC bem descrita ganha linha própria no card, com a descrição dela. NCs do mesmo item
  com a mesma descrição dividem a linha. As demais continuam agrupadas por item. A IA recebe ordem de
  manter em linha própria a NC bem descrita.
- **R5 Possível resolução**: um texto por card (até 1000 caracteres), no lugar dos comentários. Só o dono
  escreve, todos leem. Cada mudança vai para o histórico com o antes e o depois. Sai no CSV (coluna L,
  depois de B a K) e na impressão. A importação nunca a apaga.
- **R6 IA na importação**: quando o **dono** importa, os cards de Aberto e Corrigido sem resumo válido são
  resumidos um por vez, depois de a importação já estar gravada. Três falhas seguidas param a fila. A
  importação da equipe nunca chama a IA.
- **R7 Pastas**: `front/`, `back/` e `compartilhado/`; `app/` só tem a casca do Next.js.

## Contratos que mudam

- **Card** (`linhasLocais`): primeiro as linhas próprias, depois os grupos por item, cada parte do maior
  para o menor. *Bem descrita* = a descrição tem ao menos 2 palavras (4+ letras) que não estão no item nem
  são lugar ou termo vago ("parede", "cozinha", "incompatível", "fora"…).
- **CSV**: B a K iguais; L = `Possível resolução`.
- **API**: sai `POST /api/pacotes/:codigo/comentarios`; entra `PUT /api/pacotes/:codigo/resolucao` (dono),
  corpo `{ texto }` (0 a 1000; vazio apaga), 200 `{ pacote }`. `PacoteVisao` perde `comentarios` e ganha
  `resolucao: string`. Evento novo: `resolucao_alterada` `{ antes, depois }`.
- **Banco**: `pacotes.resolucao text NOT NULL DEFAULT ''`. A tabela `comentarios` deixa de ser usada e não é
  apagada onde existir; os comentários antigos continuam no histórico.

## Plano e Constitution Check

Sem dependência nova. Sai do navegador, a mais: o texto da resolução (dono), necessário para guardá-lo. Para a
IA vão os mesmos campos da 001. Princípios II e III cumpridos; IV e V exigem a emenda 1.2.0 (card, CSV e resolução).
