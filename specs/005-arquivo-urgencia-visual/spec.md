# Spec 005: arquivo, urgência, kanban fixo e visual novo

**Data**: 2026-11-26 | **Pedido e decisões**: dono do projeto, depois da 004

## Requisitos

- **R1 Arquivo**: o dono guarda no arquivo o que não vai ser resolvido, e desfaz. A equipe não arquiva.
  - **Card inteiro**: sai do kanban, de `/cards` e da impressão, e fica na página **Arquivo**, só para o dono.
    Como a conclusão, cobre as NCs visíveis naquele momento e cai (com evento) quando aparece NC nova.
  - **NC por NC**: dentro do card, a NC arquivada sai da lista e não conta para a coluna do card. Ela fica
    arquivada até o dono desfazer, mesmo que a planilha continue trazendo. Card com todas as NCs visíveis
    arquivadas vai para o Arquivo.
  - A página Arquivo mostra os cards arquivados e as NCs arquivadas soltas, com quem arquivou e quando.
- **R2 Urgência**: o dono marca e desmarca o card como urgente, por um botão no card e na ficha. O urgente
  tem selo visível para todos e fica no topo da coluna. A urgência some quando o card é concluído ou arquivado.
- **R3 Kanban fixo**: a página cabe na tela, sem rolagem da página; cada coluna rola sozinha. Cada coluna mostra
  os 10 cards mais recentes (pela NC mais nova), urgentes primeiro, e **Ver mais** traz mais 10. O contador da
  coluna mostra o total. A busca procura em todos os cards, não só nos que aparecem.
- **R4 Visual**: estilo quadro (Trello): colunas com fundo próprio, cards como cartões com sombra e cor da
  coluna, ícones nas ações e nas informações (local, prazo, empresa, NCs, urgente), com o texto junto ou como
  rótulo acessível. Cartões reagem ao passar o mouse e ao arrastar.
- **R5 Navegação**: no celular, barra fixa embaixo com ícone e nome de cada página; no computador, menu lateral
  (drawer) que abre e recolhe. As mesmas páginas de hoje, mais o Arquivo para o dono, e o Sair.

## Fora do escopo

Tema escuro, notificações, prioridade em mais de um nível, arquivo pela equipe.

## Contratos que mudam

- **API** (só o dono, 200 `{ pacote }`, 404):
  - `POST` e `DELETE /api/pacotes/:codigo/arquivo`; 409 se já está ou não está arquivado.
  - `POST` e `DELETE /api/pacotes/:codigo/ncs/:id/arquivo`.
  - `PUT /api/pacotes/:codigo/urgencia`, corpo `{ urgente: boolean }`.
  - `GET /api/pacotes` omite os arquivados para a equipe; o dono recebe tudo. `PacoteVisao` ganha
    `arquivadoEm`, `urgente` e, em cada NC, `arquivadaEm`.
- **Banco**: `pacotes.arquivado_em`, `pacotes.arquivado_ncs`, `pacotes.urgente`, `ncs.arquivada_em`.
- **Eventos**: `pacote_arquivado`, `pacote_desarquivado`, `nc_arquivada`, `nc_desarquivada`,
  `pacote_urgente`, `pacote_nao_urgente`.

## Critérios de aceite

- A equipe não consegue arquivar nem marcar urgência, nem pela tela nem chamando a API (403).
- Com 50 cards numa coluna, a página não rola; a coluna mostra 10 e o total 50; **Ver mais** chega a 20.
- Um card urgente aparece em primeiro na coluna para a equipe e para o dono.
- Importar a planilha de novo não desfaz arquivo nem urgência; NC nova num card arquivado o traz de volta.
- No celular (360 px) não há rolagem horizontal e a barra de baixo alcança todas as páginas; no computador o
  menu lateral abre e fecha pelo teclado.

## Constitution Check

O Princípio V exige a emenda 1.5.0: o arquivo (card e NC) e a urgência entram no que a equipe acrescenta (b),
só pelo dono. Ícones podem vir de dependência nova (liberada), registrada no `plan.md`.
