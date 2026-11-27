# Spec 006: recorrentes, projetos e resolução na tela

**Data**: 2026-11-26 | **Pedido e decisões**: dono do projeto, depois da 005

## Requisitos

- **R1 Resolução na tela**: o card de `/cards` mostra a possível resolução também na tela, num bloco próprio acima
  do rodapé, limitado a 3 linhas (a ficha mostra o texto inteiro). A impressão continua mostrando o texto inteiro.
- **R2 Categoria**: o card pode ser **Recorrente** (problema que se repete, tratado de outro jeito) ou **Projeto**
  (problema dos projetistas), ou nenhuma das duas. A equipe e o dono escolhem e tiram, com o nome no histórico.
  - **No kanban**: duas colunas novas, Recorrentes e Projetos, depois de Corrigido. O card com categoria fica na
    coluna da categoria, com a situação (Aberto ou Corrigido) num selo. Arrastar um card para Recorrentes ou Projetos
    dá a categoria a ele; arrastar de lá para a coluna da situação dele tira a categoria.
  - **Nas outras telas** (`/cards`, ficha, tabela): selo com a categoria. A busca acha por "recorrente" e "projeto".
  - Na ficha, os botões **Recorrente** e **Projeto** ligam e desligam a categoria (teclado e celular).
  - A categoria não vale para card concluído ou arquivado. Ao concluir, o dono tira a categoria. A importação não
    mexe nela: NC nova num card recorrente o mantém em Recorrentes.
  - As NCs continuam sendo marcadas como sempre, e o card continua podendo ir para Corrigido e Concluído.

## Revisão (27/11/2026, pedido do dono)

- **R3 Busca lembrada**: o texto da busca do kanban e de `/cards` fica guardado no navegador (cada tela o seu).
  Ao voltar de uma ficha ou recarregar a página, a busca continua lá. Nada sai do aparelho.
- **R4 Tela travada durante a gravação**: enquanto uma mudança de card grava (mover, urgência, categoria,
  marcar NC, arquivar, desarquivar…), a tela fica meio opaca com um círculo girando e não aceita clique.
  Some quando a gravação termina, com sucesso ou erro.
- **R5 Importação didática**: os passos ganham ícones, o campo de arquivo vira um botão grande com ícone, e o
  resultado mostra as contagens em itens com ícone. Os textos e o fluxo continuam os mesmos.
- **R6 Botões padrão**: as ações de navegação ("Voltar", "Ver o kanban", "Importar a planilha") são botões, não
  link de texto azul.
- **R7 Voltar de verdade**: o Voltar da ficha volta para a tela de onde a pessoa veio (kanban, cards, tabela,
  arquivo). Se a ficha foi aberta direto pelo endereço, vai para o kanban.

Fora desta revisão: a modularização com POO e SOLID (back e front) fica para a spec 007.

## Contratos que mudam

- **API**: `PUT /api/pacotes/:codigo/categoria` (equipe e dono), corpo `{ autor, categoria: "recorrente" | "projeto" | null }`.
  200 `{ pacote }`; 400 inválido; 404; 409 em card concluído ou arquivado. O mesmo valor não gera evento.
  `PacoteVisao` ganha `categoria: "recorrente" | "projeto" | null`.
- **Banco**: `pacotes.categoria text` com `CHECK (categoria IN ('recorrente', 'projeto'))`.
- **Eventos**: `categoria_mudou`, detalhe `{ antes, depois }`.

## Critérios de aceite

- A equipe arrasta um card de Aberto para Recorrentes; ele aparece lá com o selo Aberto, e o histórico mostra o nome.
- Arrastar de volta para Aberto tira a categoria. Arrastar um card recorrente em Aberto para Corrigido não faz nada
  (ele precisa ser marcado na ficha ou pelo botão).
- Reimportar a planilha mantém a categoria; concluir pelo dono a tira.
- Em `/cards`, a resolução aparece na tela sem abrir a ficha.

## Constitution Check

O Princípio V exige a emenda 1.6.0: a categoria entra em (b), dada pela equipe e pelo dono, e o kanban ganha as
colunas Recorrentes e Projetos, que agrupam os cards com categoria sem mudar a situação deles. Sem dependência nova.
