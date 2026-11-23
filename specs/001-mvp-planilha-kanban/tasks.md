---
description: "Lista de tarefas do MVP — Planilha de Inspeções e Kanban de Pacotes"
---

# Tasks: MVP — Planilha de Inspeções e Kanban de Pacotes

**Input**: documentos de design em `specs/001-mvp-planilha-kanban/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: obrigatórios, porque o Princípio III é NÃO NEGOCIÁVEL. Em cada par de tarefas
"teste → implementação", o teste é escrito primeiro e precisa **falhar** antes de a implementação
começar.

**Organization**: as tarefas estão agrupadas por história de usuário (US1 a US5 da spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente e sem dependência pendente)
- **[Story]**: história a que a tarefa pertence (US1…US5)
- Caminhos relativos à raiz do repositório (um projeto Next.js só; ver a estrutura em plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: tirar o PDF e preparar dependências e ferramenta de teste.

- [X] T001 Remover o fluxo de PDF: apagar `lib/pdf.ts`, `lib/pdfjs.d.ts`, `lib/classify.ts`, `lib/extrairLocal.ts`, `scripts/copiar-worker.mjs`, `public/pdf.worker.min.mjs`, `app/api/resumir/` e `components/CartaoNC.tsx`. Trocar `app/page.tsx` por um placeholder ("Em construção"). Tirar a linha `public/pdf.worker.min.mjs` do `.gitignore` (research.md R10). Na mesma mudança, atualizar o `README.md`: o envio de PDF saiu e a nova versão, com a planilha, está em construção (regra do README da constituição)
- [X] T002 Atualizar `package.json`:
  - Remover `pdfjs-dist`, `jszip` e o script `postinstall`.
  - Instalar `xlsx`, pelo tarball do CDN oficial da SheetJS (versão ≥ 0.20.3), `postgres` e `server-only`.
  - Instalar como dependências de desenvolvimento `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom` e `@electric-sql/pglite`.
  - Atualizar `next` para o 16 e `react`/`react-dom` para o 19 (o 14.2 tem vulnerabilidades críticas sem correção; decisão do dono). `@types/node` sobe para 22, exigido pelo Vitest 5.
  - Criar os scripts `test` (`vitest run`), `typecheck` (`tsc --noEmit`) e `db:migrar` (`node scripts/migrar.mjs`).
- [X] T003 [P] Criar `vitest.config.ts` com `environment: "node"`, alias `@` para a raiz e `include: ["**/*.test.ts", "**/*.test.tsx"]`, sem `node_modules` e `.next`. Os testes de componente usam `// @vitest-environment jsdom` no próprio arquivo
- [X] T004 [P] Reescrever `.env.example` com `DATABASE_URL`, `SENHA_EQUIPE`, `SENHA_DONO`, `SEGREDO_SESSAO`, `LLM_API_KEY`, `LLM_BASE_URL` e `LLM_MODEL`, e tirar `SITE_PASSWORD` (quickstart.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: regras de domínio puras, banco, sessão e login, que as histórias usam.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Fixture e domínio

- [ ] T005 [P] Criar `tests/fixtures/planilha.ts`. A fixture precisa ter:
  - Linhas **anonimizadas** (empresas, pessoas e CNPJ fictícios), com as 29 colunas de `contracts/planilha.md`.
  - A linha 1 vazia e o cabeçalho na linha 2.
  - Uma NC com 3 reinspeções.
  - Um item cuja última inspeção é uma linha sem NC (`APROVADO APÓS INSPECAO`), outro `NÃO SE APLICA` e outro sem `Data Inspeção`.
  - O rodapé com "MENTOR CONSTRUÇÃO / PLANEJE TECNOLOGIA" em `Código Pacote`.
  - Sublocais `.`, vazios e nos formatos `BL n - n° PAV - AP 01 95%`, `Apto 4`, `AP03` e `hall b`.
  - Um pacote igual ao 144683: fiscalização aberta e FVS aberta escondida.
  - Um pacote só de FVS e uma NC com `Data Real Correção`.

  Exportar `gerarXlsx(linhas): ArrayBuffer`, que monta o arquivo com SheetJS na memória (research.md R9).
- [ ] T006 [P] Criar `lib/dominio/tipos.ts` com os tipos `Origem`, `SituacaoNC`, `Coluna`, `PacoteImportado`, `NCImportada`, `LinhaCard` e `PacoteVisao`, conforme `contracts/api.md` e os campos de `data-model.md` (`pacotes.*`, `ncs.*`)
- [ ] T007 [P] Escrever `lib/dominio/normalizar.test.ts`:
  - Todos os exemplos da tabela "Formatação para o card" de `contracts/planilha.md` (serviço, pavimento, empresa, item, sublocal).
  - Texto: espaços repetidos e `.` vira vazio.
  - Datas `dd/mm/aaaa` e `dd/mm/aaaa hh:mm:ss` (para `aaaa-mm-dd` e ISO); data inválida vira `null`.
  - Origem por `Descrição FVS`, sem diferenciar maiúsculas e acentos.
- [ ] T008 Implementar `lib/dominio/normalizar.ts` até o T007 passar
- [ ] T009 [P] Escrever `lib/dominio/agrupar.test.ts`:
  - `juntarLocais`: `AP 1-2-3`, `HALL A-B`, `HALL A` sozinho e outros locais na ordem, sem repetir.
  - `menorPrazo`.
  - `linhasLocais`: agrupa sem diferenciar acentos e maiúsculas, ordena do maior grupo para o menor, `×n` só quando n > 1, sem limite de linhas, e cada linha traz os ids das NCs.
  - O card de referência do pacote 144683 de `contracts/planilha.md`, reproduzido com a fixture.
- [ ] T010 Implementar `lib/dominio/agrupar.ts`, trazendo `juntarLocais`, `menorPrazo` e `NOME_ORIGEM` de `lib/agrupar.ts` e acrescentando os halls e `linhasLocais`. Apagar `lib/agrupar.ts`, `lib/types.ts` e `lib/exportar.ts`. O exportar é refeito na US4, a partir de `git show d796c86:lib/exportar.ts`
- [ ] T011 [P] Escrever `lib/dominio/situacao.test.ts`:
  - `situacaoNC`: Concluída quando o item não está `REPROVADA`, Corrigida por `data_correcao` ou por marcação, Aberta nos demais casos.
  - `ncsVisiveis`: filtro de fiscalização sobre as não concluídas.
  - `colunaDoPacote`: `saiu_em`, sem NC visível, Aberto e Corrigido (data-model.md "Regras calculadas").
- [ ] T012 Implementar `lib/dominio/situacao.ts` até o T011 passar

### Banco

- [ ] T013 Criar `db/schema.sql`, idempotente (`CREATE TABLE IF NOT EXISTS`), com as tabelas `pacotes`, `ncs`, `marcacoes`, `comentarios`, `eventos` e `importacoes`, exatamente como em data-model.md:
  - PKs `pacotes.codigo`, `ncs.id`, `marcacoes.id_nc`, `comentarios.id`, `eventos.id` e `importacoes.id`.
  - FKs com `ON DELETE CASCADE`: `ncs.codigo_pacote`, `marcacoes.id_nc` e `comentarios.codigo_pacote`.
  - **Sem FK** em `eventos.codigo_pacote`.
  - Colunas que aceitam nulo: `pacotes.saiu_em`, `pacotes.resumo_ia`, `pacotes.resumo_assinatura`, `pacotes.resumo_em`, `ncs.prazo`, `ncs.data_correcao`, `ncs.ultima_inspecao` e `eventos.id_nc`.
  - `CHECK` de `ncs.origem` em (`fvs`, `fiscalizacao`).
  - Índices em `ncs.codigo_pacote` e `eventos.codigo_pacote`.
- [ ] T014 Escrever `lib/servidor/banco.test.ts`, usando `tests/banco.ts`, que cria um `Banco` em PGlite em memória e aplica `db/schema.sql`. O teste precisa falhar antes da T015: o schema aplica duas vezes sem erro, e `transacao` desfaz tudo quando a função lança erro
- [ ] T015 Criar `lib/servidor/banco.ts` com `import "server-only"`, a interface `Banco { consulta, transacao }` e a implementação com postgres.js via `DATABASE_URL`. Criar `scripts/migrar.mjs`, que aplica o schema com postgres.js (research.md R2, R3). Implementar até o T014 passar

### Validação, HTTP e sessão

- [ ] T016 [P] Escrever `lib/servidor/validar.test.ts`:
  - `str()` corta e normaliza.
  - `autor` tem de 1 a 60 caracteres (data-model.md `marcacoes.autor`, `comentarios.autor`).
  - `texto` de comentário tem de 1 a 1000 caracteres (data-model.md `comentarios.texto`).
  - Lista de ids com limite.
- [ ] T017 Implementar `lib/servidor/validar.ts`, trazendo `str()` de `lib/llm.ts`
- [ ] T018 [P] Escrever `lib/servidor/http.test.ts` (status e corpo `{ erro }` de cada caso de `contracts/api.md`; erro inesperado vira 500 sem vazar detalhe interno) e implementar `lib/servidor/http.ts` com `erroResposta` e `respostaErro(status, msg)`
- [ ] T019 [P] Escrever `lib/servidor/sessao.test.ts`:
  - O cookie assinado expira em 12 h.
  - Assinatura adulterada é recusada.
  - `exigirPapel("equipe")` aceita equipe e dono; `exigirPapel("dono")` recusa equipe com 403; sem cookie, 401.
  - `papelDaSenha` compara em tempo constante e só devolve `dono` com `SENHA_DONO`.
  - **Falha fechada**: se `SENHA_EQUIPE`, `SENHA_DONO` ou `SEGREDO_SESSAO` faltarem ou estiverem vazias, se `SEGREDO_SESSAO` tiver menos de 32 caracteres, ou se as duas senhas forem iguais, todo login é recusado com 500 e a mensagem `Acesso não configurado no servidor.`. Uma senha vazia nunca é aceita.
- [ ] T020 Implementar `lib/servidor/sessao.ts` (HMAC-SHA256 com `node:crypto` e `SEGREDO_SESSAO`, com a falha fechada da T019; research.md R4)
- [ ] T021 Escrever `app/api/sessao/route.test.ts` (POST com senha certa e errada, cookie HttpOnly/Secure/SameSite=Lax, GET 200 e 401, DELETE) e implementar `app/api/sessao/route.ts` (`contracts/api.md` "Sessão"). Na mesma mudança, documentar no `README.md` o login e as variáveis `SENHA_EQUIPE`, `SENHA_DONO` e `SEGREDO_SESSAO`
- [ ] T022 [P] Escrever `lib/api.test.ts`, com `fetch` simulado (método, URL e corpo de `entrar`, `sair` e `papel`; uma resposta `{ erro }` vira `ErroApi`, uma subclasse de `Error` com `status` (o código HTTP) e a mensagem do servidor; um 401 chega como `ErroApi` com `status: 401`), e implementar `lib/api.ts`, um cliente `fetch` tipado, que exporta `ErroApi`
- [ ] T023 Escrever `components/Entrar.test.tsx` (campo de senha com rótulo, erro da senha errada, pede o nome e guarda no `localStorage`) e `app/page.test.tsx` (com `fetch` simulado: sem sessão, `GET /api/sessao` dá 401 e aparece o `<Entrar/>`; com sessão, aparece o placeholder do quadro; depois de entrar, troca para o quadro sem recarregar a página; um `ErroApi` com `status: 401` vindo de qualquer chamada posterior volta para o `<Entrar/>`). Os dois testes precisam falhar antes da implementação. Depois, implementar `components/Entrar.tsx` e trocar o placeholder de `app/page.tsx` por essa lógica. As tarefas que mudarem `app/page.tsx` depois desta (T034) acrescentam casos ao `app/page.test.tsx`

**Checkpoint**: `npm test`, `npm run typecheck` e `next build` verdes. O login funciona.

---

## Phase 3: User Story 1 - Importar a planilha e ver os cards por pacote (Priority: P1) 🎯 MVP

**Goal**: a pessoa escolhe o `.xlsx` e vê um card por pacote, formatado e com os grupos expansíveis. Tudo é calculado no navegador.

**Independent Test**: importar o `.xlsx` gerado pela fixture e conferir cards, grupos, locais, contagens e o card de referência. Importar uma planilha sem `Sublocal` e ver a mensagem de recusa.

- [ ] T024 [P] [US1] Escrever `lib/planilha/ler.test.ts` (o contrato de `contracts/planilha.md` "Arquivo" e "Linhas"):
  - Sem a aba, a mensagem exata.
  - O cabeçalho é procurado.
  - Faltando colunas, a mensagem com **todas** as que faltam.
  - Colunas a mais são ignoradas; a ordem das colunas não importa.
  - Linhas vazias e o rodapé são descartados.
- [ ] T025 [US1] Implementar `lib/planilha/ler.ts` com SheetJS (`read` + `sheet_to_json(ws, { header: 1, raw: false, defval: "" })`), devolvendo as linhas como objetos indexados pelo nome da coluna
- [ ] T026 [P] [US1] Escrever `lib/planilha/importar.test.ts`:
  - Cada NC vira um registro.
  - A situação do item vem da inspeção mais recente, contando também as linhas sem NC; no empate, vale o maior `Identificador Histórico Item`.
  - Item sem data não conta.
  - Os campos já vêm formatados (normalizar).
  - `equipes` é juntado por pacote.
  - A saída tem **só** os campos de research.md R5. Um teste confirma que `Usuário Inspeção`, `Colaborador NC`, `Endereço` e `Ações Tomadas` não aparecem em nenhum valor.
- [ ] T027 [US1] Implementar `lib/planilha/importar.ts` (`linhas → { pacotes: PacoteImportado[], ncs: NCImportada[] }`), com os campos de data-model.md `pacotes.codigo`, `pacotes.tarefa`, `pacotes.bloco`, `pacotes.pavimento`, `pacotes.equipes`, `ncs.id`, `ncs.codigo_pacote`, `ncs.id_item`, `ncs.item`, `ncs.origem`, `ncs.tipo`, `ncs.descricao`, `ncs.sublocal`, `ncs.prazo`, `ncs.data_correcao`, `ncs.situacao_item` e `ncs.ultima_inspecao`
- [ ] T028 [P] [US1] Escrever `lib/dominio/visao.test.ts`: `montarVisao(pacote, ncs, { marcacoes, comentarios, resumo })` devolve um `PacoteVisao` com a coluna, a origem e o prazo das NCs visíveis, e as linhas locais. Usa o pacote 144683 da fixture: 18 FVS escondidas
- [ ] T029 [US1] Implementar `lib/dominio/visao.ts` (por enquanto `resumo` é ignorado; a US5 completa)
- [ ] T030 [P] [US1] Escrever `components/CartaoPacote.test.tsx`:
  - Faixa `ORIGEM | EMPRESA`, título `bloco · pavimento`, serviço, linhas, `PRAZO` e a situação do pacote (a coluna: Aberto, Corrigido ou Concluído, FR-007).
  - Cada grupo é um botão com `aria-expanded` que mostra as NCs (tipo e descrição).
  - Não há limite de linhas.
- [ ] T031 [US1] Implementar `components/CartaoPacote.tsx` e o CSS em `app/globals.css`: largura fixa (FR-009), altura livre, quebra de texto, sem rolagem horizontal a partir de 360 px
- [ ] T032 [P] [US1] Escrever `components/Importar.test.tsx`: `input type=file` com rótulo e `accept=".xlsx"`; o estado "lendo…"; a mensagem do contrato quando a planilha é recusada; `onLido(payload)` com o resultado
- [ ] T033 [US1] Implementar `components/Importar.tsx` (chama `lerPlanilha` e `importar`; o arquivo não vai a lugar nenhum)
- [ ] T034 [US1] Escrever `components/Quadro.test.tsx` (depois do `Importar`, um card por pacote, montado com `montarVisao`) e implementar `components/Quadro.tsx` (primeira versão), ligado em `app/page.tsx`, com um caso novo em `app/page.test.tsx` (com sessão, o `Quadro` aparece no lugar do placeholder). Na mesma mudança, documentar no `README.md` a importação da planilha (o arquivo não sai do navegador)

**Checkpoint**: a US1 funciona sozinha. Importar a planilha real localmente e conferir o card 144683.

---

## Phase 4: User Story 2 - Kanban dos pacotes que se mantém entre importações (Priority: P1)

**Goal**: a importação é gravada no Postgres numa transação, e o kanban de 3 colunas é igual em qualquer aparelho.

**Independent Test**: com o PGlite, importar o dia 1 e depois o dia 2 (NC aprovada, NC com correção, pacote ausente) e conferir colunas, `saiu_em` e eventos. Reimportar não gera evento.

- [ ] T035 [P] [US2] Escrever em `lib/servidor/repositorio.test.ts` o bloco `importar`, seguindo data-model.md "Transições de importação":
  - Novo pacote e nova NC geram eventos.
  - Mudança de situação grava o antes e o depois.
  - Pacote ausente recebe `pacotes.saiu_em` e o evento `pacote_saiu`; pacote que volta recebe `saiu_em = null` e `pacote_voltou`.
  - A linha de `importacoes.contagens` é gravada.
  - **Reimportar a mesma carga não gera nenhum evento**.
  - `marcacoes` e `comentarios` continuam intactos.
  - Uma falha no meio desfaz tudo.
- [ ] T036 [US2] Implementar `importar(banco, autor, carga)` em `lib/servidor/repositorio.ts`: `pg_advisory_xact_lock`, upsert de `pacotes` e `ncs`, eventos com autor `importação` e `importacoes` (data-model.md `eventos.tipo`, `eventos.autor`, `importacoes.contagens`)
- [ ] T037 [P] [US2] Escrever em `lib/servidor/repositorio.test.ts` o bloco `listarPacotes`, que devolve um `PacoteVisao[]` com a coluna certa por pacote (Concluído para ausentes e para quem não tem NC visível)
- [ ] T038 [US2] Implementar `listarPacotes(banco)` em `lib/servidor/repositorio.ts`, com `montarVisao`
- [ ] T039 [P] [US2] Escrever em `lib/servidor/validar.test.ts` a validação da carga de importação:
  - Limites de 3 MB, 500 pacotes e 10.000 NCs (413).
  - `pacotes.codigo` só com dígitos.
  - Tamanhos máximos de data-model.md `pacotes.tarefa`, `pacotes.bloco`, `pacotes.pavimento`, `pacotes.equipes`, `ncs.item`, `ncs.tipo`, `ncs.descricao` e `ncs.situacao_item`.
  - `ncs.origem` só com valores da lista.
  - `ncs.codigo_pacote` aponta para um pacote da carga.
  - Ids não se repetem.
  - Datas válidas ou `null` em `ncs.prazo`, `ncs.data_correcao` e `ncs.ultima_inspecao`.
- [ ] T040 [US2] Implementar `validarCargaImportacao` em `lib/servidor/validar.ts`, com os limites de data-model.md `pacotes.codigo` (só dígitos), `pacotes.tarefa`, `pacotes.bloco`, `pacotes.pavimento`, `pacotes.equipes`, `ncs.codigo_pacote` (aponta para um pacote da carga), `ncs.item`, `ncs.origem`, `ncs.tipo`, `ncs.descricao`, `ncs.situacao_item`, `ncs.prazo`, `ncs.data_correcao` e `ncs.ultima_inspecao`
- [ ] T041 [US2] Escrever `app/api/importacoes/route.test.ts` (401, 400, 413, 200 com `contagens`) e implementar `app/api/importacoes/route.ts`: `exigirPapel("equipe")`, validação e `importar` (`contracts/api.md` "Importação")
- [ ] T042 [US2] Escrever `app/api/pacotes/route.test.ts` (401 sem sessão, 200 com `pacotes`) e implementar `app/api/pacotes/route.ts` (GET)
- [ ] T043 [US2] Acrescentar casos em `lib/api.test.ts` e depois implementar `importar(carga)` e `listarPacotes()` em `lib/api.ts`
- [ ] T044 [US2] Acrescentar casos em `components/Quadro.test.tsx` e evoluir `components/Quadro.tsx`:
  - Carrega `GET /api/pacotes`.
  - Mostra 3 colunas com título e contagem (Aberto, Corrigido, Concluído). No celular elas ficam empilhadas, sem rolagem horizontal.
  - O `Importar` manda a carga com o nome do `localStorage`, mostra as contagens devolvidas e recarrega.
  - O Concluído mostra `saiuEm` quando houver.
  - Na mesma mudança, documentar no `README.md` o kanban, o `DATABASE_URL`, o `npm run db:migrar` e os campos que passam a ir para o servidor (`plan.md`, "Dados que saem do navegador").

**Checkpoint**: US1 + US2. Quickstart, cenários 2 e 3.

---

## Phase 5: User Story 3 - Equipe marca NCs como corrigidas e comenta (Priority: P1)

**Goal**: marcar e desmarcar NCs, mover o pacote para Corrigido, comentar e ver o histórico, sempre com autor e horário.

**Independent Test**: marcar e comentar, reimportar a mesma carga e conferir que a marcação, o comentário e os eventos continuam.

- [ ] T045 [P] [US3] Escrever em `lib/servidor/repositorio.test.ts` os blocos `marcar`, `desmarcar`, `comentar` e `historico`:
  - Marcar de novo uma NC já marcada não gera evento.
  - Desmarcar apaga a linha e grava `nc_desmarcada`.
  - Uma NC marcada que é aprovada na importação seguinte fica Concluída e o evento de marcação continua.
  - O histórico vem do mais novo para o mais antigo, no máximo 200.
  - Duas marcações simultâneas não se perdem.
- [ ] T046 [US3] Implementar `marcar`, `desmarcar`, `comentar` e `historico` em `lib/servidor/repositorio.ts` (data-model.md `marcacoes.id_nc`, `marcacoes.autor`, `marcacoes.em`, `comentarios.autor`, `comentarios.texto`, `eventos.tipo`)
- [ ] T047 [US3] Escrever `app/api/pacotes/[codigo]/marcacoes/route.test.ts` e implementar `app/api/pacotes/[codigo]/marcacoes/route.ts` (POST e DELETE): `exigirPapel("equipe")`, `autor` obrigatório, 404 para pacote inexistente (`contracts/api.md` "Kanban")
- [ ] T048 [US3] Escrever `app/api/pacotes/[codigo]/comentarios/route.test.ts` e implementar `app/api/pacotes/[codigo]/comentarios/route.ts` (POST): `exigirPapel("equipe")`, `autor` e `texto` validados, 404 para pacote inexistente
- [ ] T049 [US3] Escrever `app/api/pacotes/[codigo]/historico/route.test.ts` e implementar `app/api/pacotes/[codigo]/historico/route.ts` (GET): `exigirPapel("equipe")`, no máximo 200 eventos, 404 para pacote sem nenhum evento
- [ ] T050 [US3] Acrescentar casos em `lib/api.test.ts` e depois implementar `marcar`, `desmarcar`, `comentar` e `historico` em `lib/api.ts`
- [ ] T051 [US3] Escrever os testes e evoluir `components/CartaoPacote.tsx`:
  - Checkbox com rótulo para cada NC expandida, mostrando `marcadaPor`.
  - Botão "Mover para Corrigido", que marca todas as abertas visíveis.
  - Formulário de comentário com rótulo e lista de comentários.
  - Se o nome não estiver no `localStorage`, pede o nome antes de gravar (US3, cenário 4).
- [ ] T052 [P] [US3] Escrever `components/Historico.test.tsx` e implementar `components/Historico.tsx` (lista de eventos com autor, data e hora e descrição legível de cada `eventos.tipo`), aberto a partir do card

**Checkpoint**: US1 a US3, que são o núcleo do MVP. Quickstart, cenário 4.

---

## Phase 6: User Story 4 - Exportar o resumo (Priority: P2)

**Goal**: copiar o texto, baixar o CSV (colunas B a K) e imprimir, a partir do kanban.

**Independent Test**: com a carga da fixture, o CSV bate coluna a coluna com `contracts/exportacao.md`.

- [ ] T053 [P] [US4] Escrever `lib/exportar.test.ts`:
  - CSV com BOM, `;`, CRLF, aspas, cabeçalho e as colunas B a K mapeadas como em `contracts/exportacao.md`.
  - Bloco sem o prefixo "Bloco ", prazo em `dd/mm/aaaa` e resumo com quebra de linha.
  - Só os pacotes de Aberto e Corrigido.
  - Texto no formato do `cartaoParaTexto`.
- [ ] T054 [US4] Reimplementar `lib/exportar.ts` sobre `PacoteVisao`, a partir de `git show d796c86:lib/exportar.ts` (`cartaoParaTexto`, `cartoesParaTexto`, `cartoesParaCSV`, `baixar`)
- [ ] T055 [US4] Escrever `components/Exportar.test.tsx` e implementar `components/Exportar.tsx` (botões com rótulo "Copiar texto", "Baixar CSV" e "Imprimir"), ligado ao `Quadro`. Acrescentar `@media print` em `app/globals.css` (só os cards de Aberto e Corrigido, sem a barra nem os botões). Na mesma mudança, documentar no `README.md` a exportação (texto, CSV colado a partir de B2 e impressão)
- [ ] T056 [US4] Conferir o CSV com a planilha de controle real (aba NCs, a partir de B2). Se divergir, corrigir `contracts/exportacao.md` e o T053 **antes** do código. Precisa que o dono forneça a planilha de controle

**Checkpoint**: US1 a US4. Quickstart, cenário 7.

---

## Phase 7: User Story 5 - Dono gera cards compactos com IA e pode excluir pacotes (Priority: P2)

**Goal**: só o dono aciona a IA. O resumo aceito cobre todas as NCs, os locais são calculados pelo servidor, o resumo fica guardado para todos e é invalidado pela assinatura. O dono pode excluir um pacote.

**Independent Test**: com a sessão da equipe, a rota de resumo dá 403. Com a do dono e uma IA simulada, a resposta que esquece uma NC é recusada e a válida é gravada e exibida. Mudar uma NC invalida o resumo.

- [ ] T057 [P] [US5] Escrever `lib/dominio/assinatura.test.ts` (independe da ordem das NCs; muda quando muda `id`, `item`, `descricao` ou `sublocal`, ou quando uma NC entra ou sai do conjunto visível; **não** muda quando uma NC passa de Aberta para Corrigida) e implementar `lib/dominio/assinatura.ts` com SHA-256 (data-model.md "Resumo da IA válido para exibição"; `pacotes.resumo_assinatura`)
- [ ] T058 [P] [US5] Escrever `lib/servidor/ia.test.ts`, com o cliente da IA injetado:
  - O prompt traz só ids curtos e campos cortados (item 120, descrição 300, sublocal 60), no máximo 300 NCs, e diz que o texto é dado.
  - As 4 regras de validação de `contracts/ia.md`: JSON inválido, `linhas` fora de 1 a 30, texto vazio, id inventado e NC faltando são recusados.
  - A linha final é montada como `texto (juntarLocais) ×n`, com os ids reais.
- [ ] T059 [US5] Implementar `lib/servidor/ia.ts`, trazendo `perguntarLLM` e `lerJSON` de `lib/llm.ts` e apagando `lib/llm.ts`
- [ ] T060 [US5] Escrever os testes e implementar `salvarResumo` e `excluirPacote` em `lib/servidor/repositorio.ts`:
  - `salvarResumo` grava `pacotes.resumo_ia`, `pacotes.resumo_assinatura` e `pacotes.resumo_em` e o evento `resumo_ia_gerado`, com autor `dono`.
  - `excluirPacote` apaga o pacote com as NCs, marcações e comentários (cascade) e grava `pacote_excluido`. O evento continua lá, porque `eventos.codigo_pacote` não tem FK.
- [ ] T061 [US5] Completar `lib/dominio/visao.ts` e o teste dele: se `resumo_assinatura` for igual a `assinatura(NCs visíveis)`, `linhas` vêm do resumo, com `resumoIA: true`; senão, vêm as linhas locais
- [ ] T062 [US5] Escrever os testes e implementar `app/api/pacotes/[codigo]/resumo/route.ts` (POST, `exigirPapel("dono")`, `maxDuration = 60`, lê as NCs do banco; em falha devolve 200 com `aviso` e não grava nada) e `app/api/pacotes/[codigo]/route.ts` (DELETE, dono). O teste confirma o 403 para a equipe (SC-005) (`contracts/api.md` "Dono")
- [ ] T063 [US5] Acrescentar casos em `lib/api.test.ts` e depois implementar `resumir(codigo)` e `excluir(codigo)` em `lib/api.ts`. Escrever os testes e evoluir `components/Quadro.tsx` e `components/CartaoPacote.tsx`, com os botões visíveis só para o papel `dono`:
  - "Resumir com IA" no card.
  - "Resumir todos", que chama um pacote por vez, com progresso.
  - "Excluir", com confirmação.
  - Um selo "IA" quando `resumoIA` é verdadeiro.
  - Na mesma mudança, documentar no `README.md` a IA só para o dono, as variáveis `LLM_*`, o que vai para a IA (`plan.md`) e a exclusão definitiva.

**Checkpoint**: as 5 histórias. Quickstart, cenários 8 a 10.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T064 [P] Revisar o `README.md` inteiro (FR-029), que já foi atualizado a cada mudança, e conferir que ele descreve: o fluxo com a planilha, os 2 níveis de acesso, as variáveis de ambiente, o `npm run db:migrar`, o deploy no Vercel com o Neon, os campos que saem do navegador (research.md R5) e o que vai para a IA
- [ ] T065 [P] Passar a acessibilidade em `components/*.tsx`: todo campo com rótulo, foco visível, ordem de tabulação, grupos expansíveis por teclado (Enter e Espaço) e contraste das faixas de origem (quickstart, cenário 12)
- [ ] T066 Rodar a verificação de limpeza de `quickstart.md` §4 e apagar o que restar (SC-008)
- [ ] T067 Importar a planilha real no celular usado na obra e medir. Se a leitura passar de 3 s, mover `lib/planilha/ler.ts` e `importar.ts` para um Web Worker (research.md R1, shortcut; SC-001)
- [ ] T068 Conferir a implantação no Vercel: `SITE_PASSWORD` removida, todas as variáveis em Production e Preview, `npm run db:migrar` rodado no banco de produção com o schema final, e o login, uma importação, uma marcação e uma exportação funcionando no site publicado
- [ ] T069 Rodar `npm test`, `npm run typecheck` e `npx next build` e os 12 cenários de `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1 (3)** depende só da fase 2.
- **US2 (4)** depende da US1 (`importar.ts`, `visao.ts`, `CartaoPacote`).
- **US3 (5)** depende da US2 (o repositório e o kanban gravados).
- **US4 (6)** depende da US1 (`PacoteVisao`). Pode correr em paralelo com a US2 e a US3, usando visões montadas em teste.
- **US5 (7)** depende da US2 (o repositório). Pode correr em paralelo com a US3 e a US4.
- **Polish (8)** vem depois das histórias desejadas.

### Within Each User Story

- O teste é escrito e **falha** antes da implementação.
- A ordem é: domínio, depois repositório, depois rota, depois `lib/api.ts`, depois componente.
- Fazer commit ao fim de cada par teste + implementação, com os 3 portões verdes.
- **README**: toda tarefa que muda o que o usuário vê, as variáveis de ambiente ou o que sai do navegador atualiza o `README.md` no mesmo commit (regra do README da constituição). Nenhum checkpoint vai para push com o README desatualizado.
- **Configuração no Vercel antes dos pushes** (o dono faz no painel do Vercel e do Neon):
  - Antes do primeiro push depois da T021: cadastrar `SENHA_EQUIPE`, `SENHA_DONO` e `SEGREDO_SESSAO` (32+ caracteres) em Production e Preview. Sem isso, a falha fechada da T019 recusa todo login no site publicado.
  - Antes do push do checkpoint da US2: criar o banco Neon pelo marketplace do Vercel e ligá-lo ao projeto (o que cria `DATABASE_URL`), e rodar `npm run db:migrar` contra ele.
  - Antes do push do checkpoint da US5: cadastrar `LLM_API_KEY` e, se quiser, `LLM_BASE_URL` e `LLM_MODEL`.
  - Se o schema mudar em alguma tarefa depois disso, rodar `npm run db:migrar` de novo antes do push.
- **Push e deploy**: o Vercel publica a `main` a cada push. O dono aceitou que o site fique incompleto durante a migração, então o push está liberado **só nos checkpoints** (fim de cada fase), sempre com os 3 portões verdes. Entre a T001 e o checkpoint da US1, o site publicado mostra só o placeholder.

### Parallel Opportunities

- Fase 1: T003 e T004.
- Fase 2: T005, T006, T007, T009, T011, T016, T018, T019 e T022 são arquivos diferentes e podem ser escritos juntos.
- US1: T024, T026, T028, T030 e T032 são os testes, e podem ser escritos juntos.
- US2: T035, T037 e T039.
- US5: T057 e T058.
- Com a US2 pronta, a US3, a US4 e a US5 podem correr em paralelo (arquivos diferentes, exceto `repositorio.ts` e `CartaoPacote.tsx`, que precisam de cuidado).

## Parallel Example: User Story 1

```text
Juntos: T024 ler.test.ts | T026 importar.test.ts | T028 visao.test.ts | T030 CartaoPacote.test.tsx | T032 Importar.test.tsx
Depois, cada implementação até o seu teste passar: T025, T027, T029, T031, T033 → T034
```

## Implementation Strategy

### MVP First

1. Fases 1 e 2.
2. **US1**: o card formatado no navegador. Validar com a planilha real antes de seguir.
3. **US2 + US3**: o kanban gravado e as marcações. Este é o MVP que vai para a equipe (spec, Q1: B).

### Incremental Delivery

4. **US4**: a exportação. Antes de liberar para a equipe, porque ela depende da exportação hoje.
5. **US5**: a IA do dono e a exclusão.
6. Polish e deploy no Vercel.

> O `/speckit-analyze` é recomendado antes do `/speckit-implement`, porque a feature toca os princípios I, II e V.
