# Implementation Plan: MVP — Planilha de Inspeções e Kanban de Pacotes

**Branch**: `001-mvp-planilha-kanban` (commits direto na `main`) | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-mvp-planilha-kanban/spec.md`

## Summary

O envio de PDF sai e entra a importação da planilha "Base de Dados de Inspeções".

- **No navegador**: o SheetJS lê a planilha, as reinspeções são deduplicadas e a situação de
  cada item é calculada. Só os campos estruturados vão ao servidor.
- **No servidor**: as rotas do Next.js gravam num Postgres (Neon), numa transação só, e montam o
  kanban.
  - A situação da NC e a coluna do pacote são calculadas, não gravadas.
  - Marcações, comentários e histórico ficam em tabelas que a importação não toca.
- **Acesso**: senha da equipe e senha do dono, com um cookie assinado.
- **IA (só o dono)**: escreve o texto das linhas do card e aponta quais NCs cada linha cobre.
  Os locais e as contagens são calculados pelo servidor, e por isso nenhum se perde.
- **Organização**: o código é separado em `lib/dominio` (regras puras, usadas na interface e no
  servidor), `lib/planilha` (só navegador), `lib/servidor` (só servidor) e `components/`.

## Technical Context

**Language/Version**: TypeScript 5, Node 20 (Vercel)

**Primary Dependencies**:
- Já existentes: Next.js 14.2 (App Router, atualizar para o último patch 14.2.x), React 18.
- Novas em produção: SheetJS CE `xlsx` (pelo CDN oficial), `postgres` (postgres.js) e `server-only`.
- Novas em desenvolvimento: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`
  e `@electric-sql/pglite`.
- Removidas: `pdfjs-dist` e `jszip`.

**Storage**: Postgres gerenciado (Neon, pelo marketplace do Vercel). O esquema fica em
`db/schema.sql`. Detalhes em [data-model.md](data-model.md).

**Testing**: Vitest. Os testes de banco usam o PGlite em memória, e os de componente usam o
`jsdom`, configurado por arquivo.

**Target Platform**: navegador de celular e de computador, e funções Node do Vercel.

**Project Type**: aplicação web (Next.js com interface e API no mesmo projeto).

**Performance Goals**:
- Importar a planilha real (cerca de 524 mil linhas declaradas e 6.300 úteis) e ver o kanban em
  menos de 1 minuto no celular usado na obra.
- `GET /api/pacotes` em menos de 1 s com 100 pacotes.

**Constraints**:
- O arquivo não sai do navegador.
- O corpo da importação tem no máximo 3 MB.
- As rotas de IA têm `maxDuration` de 60 s.
- Sem rolagem horizontal a partir de 360 px.

**Scale/Scope**: uma obra, até uns 20 usuários, cerca de 100 pacotes e 2 mil NCs ativas.

## Dados que saem do navegador (Princípio I)

### Do navegador para o servidor (`POST /api/importacoes`)

O arquivo `.xlsx` não sai do navegador. Saem só estes campos, já normalizados
([contracts/planilha.md](contracts/planilha.md)):

| Campo enviado | Coluna de origem | Por quê |
|---|---|---|
| `codigo` | `Código Pacote` | Identidade do pacote |
| `tarefa` | `Tarefa`, reduzida ao serviço (ex.: `Alvenaria`) | Título do card |
| `bloco` | `Etapa` | Card e CSV (Bloco) |
| `pavimento` | `Local`, formatado (ex.: `3º PAV.`) | Card e CSV (Pavimento) |
| `equipes` | `Equipe(s)`, sem o código e sem repetição | Card e CSV (Empresa) |
| `id` | `Identificador Vínculo Problema` | Identidade da NC |
| `idItem` | `Identificador Vínculo Item` | Junta NCs do mesmo item |
| `item` | `Descrição Item Inspeção`, sem o código | Agrupamento do card |
| `origem` | derivada de `Descrição FVS` | Regra FVS × fiscalização. Só sai `fvs` ou `fiscalizacao` |
| `tipo` | `Tipo de Não Conformidade` | Lista expandida do grupo |
| `descricao` | `Descrição Problema` | Lista expandida e IA |
| `sublocal` | `Sublocal`, formatado (ex.: `AP 1`) | Locais do card |
| `prazo` | `Data Prevista Correção` | Prazo mais próximo |
| `dataCorrecao` | `Data Real Correção` | Situação Corrigida |
| `situacaoItem` | `Situação do Item` da inspeção mais recente | Situação Concluída |
| `ultimaInspecao` | `Data Inspeção` da inspeção mais recente | Ordem e histórico |

**Ficam no navegador**:
- `Usuário Inspeção` e `Colaborador NC`, que são nomes de pessoas e nenhuma regra usa.
- `Endereço` e `Ações Tomadas`.
- Os identificadores de ficha e de histórico, as porcentagens e os status gerais.
- As linhas de itens sem NC, que só servem para calcular a situação do item.

Além dos campos da planilha, a equipe envia o próprio nome (`autor`, de 1 a 60 caracteres) e
os comentários.

### Do servidor para a IA (`POST /api/pacotes/:codigo/resumo`, só o dono)

| Campo | Limite | Por quê |
|---|---|---|
| `tarefa` do pacote | 120 caracteres | Contexto do resumo |
| Id curto da NC (`n1`, `n2`…) | Gerado pelo servidor | A IA aponta quais NCs cada linha cobre. Os ids reais não saem |
| `item` | 120 caracteres | O que a IA agrupa |
| `descricao` | 300 caracteres | O que a IA resume |
| `sublocal` | 60 caracteres | Para a IA juntar problemas do mesmo lugar. Os locais exibidos são montados pelo servidor |

No máximo 300 NCs por chamada. Empresa, bloco, pavimento, prazos e nomes da equipe não vão para
a IA ([contracts/ia.md](contracts/ia.md)).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano cumpre | Situação |
|---|---|---|
| I. Leitura local | A planilha é lida em `lib/planilha` (só navegador). Os campos que saem para o servidor e para a IA estão listados e justificados acima, em "Dados que saem do navegador". `Usuário Inspeção` e `Colaborador NC` não saem | ✅ |
| II. IA do dono | `exigirPapel("dono")` na rota de resumo. O prompt trata o texto como dado. A resposta é validada (todos os ids cobertos). Locais e contagem são calculados pelo servidor. Se algo falhar, o card fica com o resumo local ([contracts/ia.md](contracts/ia.md)) | ✅ |
| III. Test-First | Vitest em `lib/`, rotas e componentes. A fixture anonimizada vira `.xlsx` na memória. Há testes de regressão para reinspeção, rodapé, sublocal vazio ou ".", `NÃO SE APLICA` e FVS com fiscalização | ✅ |
| IV. Contratos fixos | [contracts/planilha.md](contracts/planilha.md) e [contracts/exportacao.md](contracts/exportacao.md), cada um travado por um teste de contrato. Card por pacote, agrupado por item, com locais e contagem | ✅ |
| V. Planilha diária | O banco guarda só os itens (a) a (d). A importação é transacional e não toca `marcacoes` nem `comentarios`. Pacote ausente vai para Concluído. Toda mudança gera um evento. A exclusão só pelo dono preserva os `eventos`, que não têm FK | ✅ |
| Restrições técnicas | Next/React/TS no Vercel. O PDF é removido. Há dois níveis de acesso, e nenhuma rota de dados fica aberta. Segredos só em variáveis de ambiente. Entradas validadas e limitadas. Interface responsiva e acessível por teclado. Tudo em pt-BR | ✅ |
| Fluxo | Spec → plano → tarefas. `vitest run`, `tsc --noEmit` e `next build` antes do push. O README é atualizado na mesma mudança (FR-029) | ✅ |

**Re-check pós-design**: o modelo de dados e os contratos não criam armazenamento além do
(a)–(d), não mandam campo pessoal ao servidor e não dão à equipe nenhum caminho até a IA.
Continua ✅. O `/speckit-analyze` é recomendado antes de implementar, porque a feature toca os
princípios I, II e V.

## Project Structure

### Documentation (this feature)

```text
specs/001-mvp-planilha-kanban/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── planilha.md      # entrada (Princípio IV)
│   ├── api.md           # rotas
│   ├── ia.md            # resumo do dono
│   └── exportacao.md    # CSV, texto, impressão
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
app/
├── layout.tsx                         # mantém
├── globals.css                        # card com largura fixa e altura livre; kanban responsivo
├── page.tsx                           # só compõe: <Entrar/> sem sessão, senão <Quadro/>
└── api/
    ├── sessao/route.ts                # POST entra, GET papel, DELETE sai
    ├── importacoes/route.ts           # POST (equipe)
    └── pacotes/
        ├── route.ts                   # GET kanban (equipe)
        └── [codigo]/
            ├── route.ts               # DELETE (dono)
            ├── historico/route.ts     # GET (equipe)
            ├── marcacoes/route.ts     # POST/DELETE (equipe)
            ├── comentarios/route.ts   # POST (equipe)
            └── resumo/route.ts        # POST (dono, IA)

components/                            # interface (client components), cada um com *.test.tsx
├── Entrar.tsx                         # senha + nome
├── Quadro.tsx                         # carrega o kanban, as 3 colunas e a barra de ações
├── Importar.tsx                       # escolhe o .xlsx e mostra os erros do contrato e as contagens
├── CartaoPacote.tsx                   # substitui CartaoNC: grupos expansíveis, marcar, comentar
├── Historico.tsx                      # eventos do pacote
└── Exportar.tsx                       # copiar texto, CSV, imprimir

lib/
├── dominio/                           # puro, sem I/O, roda na interface e no servidor
│   ├── tipos.ts                       # Pacote, NC, Situacao, Coluna, PacoteVisao…
│   ├── normalizar.ts                  # texto, "." como vazio, datas
│   ├── situacao.ts                    # situacaoNC, ncsVisiveis, colunaDoPacote
│   ├── agrupar.ts                     # juntarLocais, menorPrazo, linhasLocais (vem de lib/agrupar.ts)
│   └── assinatura.ts                  # hash das NCs para invalidar o resumo da IA
├── planilha/                          # só navegador
│   ├── ler.ts                         # .xlsx → linhas com cabeçalho validado (SheetJS)
│   └── importar.ts                    # linhas → { pacotes, ncs } deduplicados
├── servidor/                          # só servidor (import "server-only")
│   ├── banco.ts                       # interface Banco + implementação postgres.js
│   ├── sessao.ts                      # cookie assinado, exigirPapel
│   ├── validar.ts                     # str(), limites, validação dos corpos
│   ├── repositorio.ts                 # importar, listar, marcar, comentar, excluir, histórico
│   ├── ia.ts                          # perguntarLLM (vem de lib/llm.ts) + prompt + validação
│   └── http.ts                        # erroResposta e helpers de resposta
├── api.ts                             # cliente fetch tipado usado pelos componentes
└── exportar.ts                        # texto e CSV (adaptado para PacoteVisao)

db/schema.sql                          # tabelas, idempotente
scripts/migrar.mjs                     # aplica o schema (npm run db:migrar)
tests/
├── fixtures/planilha.ts               # linhas anonimizadas (reinspeção, rodapé, ".", FVS+fiscalização, NÃO SE APLICA)
└── banco.ts                           # Banco em PGlite para os testes
vitest.config.ts
```

**Removidos**: `lib/pdf.ts`, `lib/pdfjs.d.ts`, `lib/classify.ts`, `lib/extrairLocal.ts`,
`lib/types.ts`, `lib/agrupar.ts` e `lib/llm.ts` (o conteúdo útil vai para `lib/dominio` e
`lib/servidor`), `app/api/resumir/`, `components/CartaoNC.tsx`, `scripts/copiar-worker.mjs`,
`public/pdf.worker.min.mjs`, o `postinstall` e a linha `public/pdf.worker.min.mjs` do
`.gitignore`.

**Structure Decision**: continua um projeto Next.js só. Separar em `frontend/` e `backend/`
duplicaria as regras de domínio e o deploy sem ganho nenhum. A separação entre interface e
servidor é feita pelas pastas:

- `components/` + `lib/planilha` + `lib/api.ts` rodam só no navegador.
- `app/api/` + `lib/servidor` rodam só no servidor. O pacote `server-only` impede que esse
  código seja importado pela interface.
- `lib/dominio` é a única parte compartilhada.

As rotas só fazem três coisas: validar a entrada, chamar `exigirPapel` e chamar o repositório.
A regra de negócio fica toda em `lib/`.

## Complexity Tracking

Nenhuma violação da constituição para justificar.
