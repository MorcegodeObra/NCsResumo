# Pesquisa 005

## R1 "Mais recente"

- **Decisão**: nova coluna `ncs.criada_em timestamptz NOT NULL DEFAULT now()`. O card leva o `recenteEm`, a maior
  `criada_em` entre as NCs visíveis. Em caso de empate, vale a maior `ultimaInspecao` e, depois, a ordem de hoje.
- **Motivo**: hoje o banco não guarda quando a NC entrou. A `ultima_inspecao` muda a cada reinspeção e a
  `atualizado_em` muda a cada importação.
- **Limite**: as NCs que já estão no banco ganham a data da migração e empatam. Nesses casos o desempate pela
  inspeção decide até as NCs novas chegarem.

## R2 Arquivo do card

- **Decisão**: `pacotes.arquivado_em` e `arquivado_ncs`, no mesmo formato de `concluido_em` e `concluido_ncs`. O
  arquivo vale enquanto as NCs visíveis forem as mesmas que estavam no card quando ele foi arquivado. Na importação,
  `derrubarConclusoes` passa a apagar também o arquivo que deixou de valer e grava o evento `pacote_desarquivado`
  com o autor "importação".
- **Card sem nenhuma NC visível porque todas foram arquivadas uma a uma**: conta como arquivado, sem precisar gravar
  `arquivado_em`. O `arquivadoEm` dele é a data da última NC arquivada.
- **Alternativa recusada**: criar uma coluna "arquivado" no kanban. Isso misturaria o arquivo com as colunas, e as
  regras da coluna estão na constituição.

## R3 Ver mais

- **Decisão**: o corte de 10 é feito no navegador, em cima da lista que já chega inteira. Cada coluna guarda quantos
  cards mostra, começando em 10 e somando 10 a cada clique. Com busca preenchida, o corte vale para o resultado da
  busca.
- **Motivo**: são poucas centenas de pacotes. Paginar a API complicaria a busca e o arrastar sem nenhum ganho
  visível.

## R4 Celular

- **Decisão**: abaixo de 800 px, o kanban mostra uma coluna de cada vez, com abas (Aberto 12 | Corrigido 5) e a
  coluna ocupando a altura que sobra entre o topo e a barra de baixo. No celular não dá para arrastar entre abas;
  o botão de mover continua.
- **Alternativa recusada**: deslizar entre as colunas para o lado, como no Trello. Isso é rolagem horizontal, que a
  constituição proíbe no celular.

## R5 Ícones

- **Decisão**: `lucide-react`. São cerca de 15 ícones, todos do mesmo traço, e cada um é importado sozinho.
  - Ícone ao lado de texto: `aria-hidden`.
  - Ícone sem texto (botão do drawer, selo de urgente): ganha `aria-label`.
- **Alternativa recusada**: copiar o SVG de cada ícone para o código, o que daria mais trabalho e mais chance de erro.

## R6 Drawer no PC

- **Decisão**: o menu lateral fica sempre na tela e tem dois tamanhos: aberto (ícone e nome) e recolhido (só o
  ícone). Um botão no topo alterna entre os dois e a escolha fica no `localStorage`. Por ser um elemento comum da
  página, o teclado chega a ele normalmente, sem prender o foco.
- **Alternativa recusada**: um drawer que se abre por cima da página, que exigiria prender o foco e um fundo
  escurecido.
