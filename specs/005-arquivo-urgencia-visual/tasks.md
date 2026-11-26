# Tarefas 005: arquivo, urgência, kanban fixo e visual novo

Entrada: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md),
[research.md](research.md). Os testes vêm primeiro em todas as histórias (Princípio III). Testes e build rodam
separados, por causa da memória.

Histórias: **US1** Arquivo (R1) · **US2** Urgência (R2) · **US3** Kanban fixo (R3) · **US4** Visual e navegação (R4, R5).

## Fase 1: Preparação

- [X] T001 Emenda 1.5.0 em `.specify/memory/constitution.md`: arquivo (card e NC) e urgência entram em (b), só pelo dono; NC nova derruba o arquivo do card
- [X] T002 [P] Instalar `lucide-react` (`npm i lucide-react`) e conferir `package.json`

## Fase 2: Base (bloqueia todas as histórias)

- [X] T003 Colunas novas em `back/db/schema.sql`, com `ADD COLUMN IF NOT EXISTS` (data-model.md: `pacotes.arquivado_em`, `pacotes.arquivado_ncs`, `pacotes.urgente`, `ncs.arquivada_em`, `ncs.criada_em`); o `INSERT` e o `UPDATE` da importação em `back/servidor/repositorio.ts` não tocam nelas
- [X] T004 Campos novos em `compartilhado/dominio/tipos.ts`, conforme contracts/api.md (`arquivadoEm`, `urgente`, `recenteEm`, `arquivadas`, `NCVisao.arquivadaEm`); acertar `front/testes/pacoteVisao` e as fixtures que quebrarem
- [X] T005 Testes em `back/dominio/visao.test.ts` para as regras 1 a 6 do data-model.md (NC arquivada fora das visíveis, `arquivadoEm` pelas duas vias, urgente escondido em Concluído e no arquivo, `recenteEm`)
- [X] T006 `montarVisao` em `back/dominio/visao.ts` com essas regras (`Extras` ganha arquivo e urgência); `visoes()` em `back/servidor/repositorio.ts` lê as colunas novas

## Fase 3: US1 Arquivo (MVP)

Teste independente: o dono arquiva um card e uma NC e os vê em `/arquivo`; a equipe recebe 403 nas rotas e não vê o card; NC nova na importação traz o card de volta.

- [X] T007 [P] [US1] Testes em `back/rotas/arquivo.test.ts`: POST/DELETE com 200, 403 da equipe, 404, 409 e eventos; reimportar com NC nova derruba o arquivo com o autor "importação"; desarquivar o card desarquiva as NCs dele
- [X] T008 [P] [US1] Testes em `back/rotas/arquivoNc.test.ts`: POST/DELETE, NC de outro pacote dá 404, NC não visível dá 409, reimportar mantém a NC arquivada, todas as NCs arquivadas mandam o card para o arquivo
- [X] T009 [US1] Em `back/servidor/repositorio.ts`: `arquivar`, `desarquivar`, `arquivarNc` e `desarquivarNc`, com eventos, `urgente = false` ao arquivar; `derrubarConclusoes` também derruba o arquivo do card
- [X] T010 [US1] Rotas `back/rotas/arquivo.ts` e `back/rotas/arquivoNc.ts` (dono), com o `:id` validado em `back/servidor/validar.ts`, e as reexportações em `app/api/pacotes/[codigo]/arquivo/route.ts` e `app/api/pacotes/[codigo]/ncs/[id]/arquivo/route.ts`
- [X] T011 [US1] `back/rotas/pacotes.ts` omite os arquivados para a equipe; teste em `back/rotas/pacotes.test.ts`
- [X] T012 [P] [US1] `arquivar`, `desarquivar`, `arquivarNc` e `desarquivarNc` em `front/lib/api.ts`, com teste em `front/lib/api.test.ts`
- [X] T013 [US1] Botões **Arquivar card** e **Arquivar NC** (só para o dono) em `front/componentes/Ficha.tsx`, com testes em `front/componentes/Ficha.test.tsx`
- [X] T014 [US1] Página `front/componentes/Arquivo.tsx` com `app/arquivo/page.tsx`: cards arquivados e NCs arquivadas soltas, com data e **Desarquivar**; só o dono; teste em `front/componentes/Arquivo.test.tsx`
- [X] T015 [US1] Filtrar `!p.arquivadoEm` em `front/componentes/Kanban.tsx`, `Cards.tsx` e `Tabela.tsx`; link Arquivo do dono em `front/componentes/Moldura.tsx`; textos dos eventos novos em `front/componentes/Historico.tsx`

## Fase 4: US2 Urgência

Teste independente: o dono marca o card, que ganha o selo e vai para o topo da coluna para os dois papéis; a equipe recebe 403.

- [X] T016 [P] [US2] Testes em `back/rotas/urgencia.test.ts`: PUT com 200 e evento, mesmo valor sem evento, 400 com corpo inválido, 403 da equipe, 409 em card arquivado ou Concluído; concluir limpa a urgência
- [X] T017 [US2] `definirUrgencia` em `back/servidor/repositorio.ts` (`concluir` também grava `urgente = false`); rota `back/rotas/urgencia.ts` e `app/api/pacotes/[codigo]/urgencia/route.ts`
- [X] T018 [P] [US2] `definirUrgencia` em `front/lib/api.ts`; botão de urgência do dono em `front/componentes/Ficha.tsx` e `front/componentes/CartaoKanban.tsx`; selo visível para todos; testes nos `.test.tsx` deles

## Fase 5: US3 Kanban fixo

Teste independente: com 50 cards numa coluna, a página não rola, a coluna mostra 10 e o total 50, **Ver mais** chega a 20 e a busca acha um card que estava escondido.

- [X] T019 [US3] Testes em `front/componentes/Kanban.test.tsx`: corte de 10, urgentes primeiro e depois `recenteEm`, contador com o total, Ver mais, busca em todos, abas no celular
- [X] T020 [US3] `front/componentes/Kanban.tsx`: campo de busca (`front/lib/buscar.ts`), ordem, corte por coluna com Ver mais, abas Aberto/Corrigido(/Concluído) abaixo de 800 px (research R3, R4)
- [X] T021 [US3] `front/estilos/globals.css`: o kanban ocupa a altura que sobra (`100dvh` menos o topo e a barra) e só as `.cards` rolam; sem rolagem horizontal em 360 px

## Fase 6: US4 Visual e navegação

Teste independente: no celular, a barra de baixo leva a todas as páginas; no PC, o menu lateral abre e recolhe pelo teclado e a escolha fica salva ao recarregar.

- [X] T022 [US4] Testes em `front/componentes/Moldura.test.tsx`: links com nome acessível, Arquivo só para o dono, botão do drawer com `aria-expanded` e o estado no `localStorage`
- [X] T023 [US4] `front/componentes/Moldura.tsx`: navegação com ícones; barra fixa embaixo no celular e menu lateral que recolhe no PC (research R6); Sair dentro da navegação
- [X] T024 [P] [US4] Ícones e rótulos em `front/componentes/CartaoKanban.tsx`, `front/componentes/Ficha.tsx` e `front/componentes/CartaoPacote.tsx` (local, prazo, empresa, NCs, urgente, ações), com o ícone `aria-hidden` ao lado do texto (research R5)
- [X] T025 [US4] `front/estilos/globals.css`: cartões com sombra e com a cor da coluna, reação ao passar o mouse e ao arrastar, barra, drawer e foco visível; a impressão esconde a navegação

## Fase 7: Fechamento

- [X] T026 `README.md`: Arquivo, urgência e navegação nova; `.specify/PENDENCIAS.md`: migrar o Neon também para a 005
- [X] T027 Portões: `npm test`, depois `npx tsc --noEmit`, depois `npm run build` (um de cada vez); cenários do [quickstart.md](quickstart.md) — portões ok (399 testes, tsc, build); cenários manuais ainda por fazer

## Dependências

- As Fases 1 e 2 vêm antes de tudo. A US1 e a US2 só dependem da Fase 2.
- A US3 usa `urgente` e `recenteEm` (Fase 2) e o filtro do arquivo (T015). Se ela vier antes da US1, o filtro entra no T020.
- A US4 vem por último, porque mexe nos mesmos arquivos de interface. O T024 pode correr junto com o T023.
- Paralelos: T002 com T003; T007 com T008 e com T012; T016 com T018 (este só no `api.ts`).

## Estratégia

MVP = Fases 1, 2 e 3 (Arquivo), que já dão para usar e testar sozinhas. Depois vêm US2, US3 e US4, cada uma com o
seu commit e sem quebrar os portões.
