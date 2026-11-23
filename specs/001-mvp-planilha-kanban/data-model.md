# Data Model: MVP — Planilha de Inspeções e Kanban de Pacotes

O banco guarda só o que o Princípio V autoriza: (a) os campos da planilha, (b) os acréscimos da
equipe, (c) o histórico e (d) o resumo da IA. A situação da NC e a coluna do pacote não são
gravadas: são calculadas (ver `research.md` R6).

## Tabelas

### `pacotes` (a + d)

| Campo | Tipo | Regra |
|---|---|---|
| `codigo` | text PK | `Código Pacote`, só dígitos |
| `tarefa` | text | ≤ 200 |
| `bloco` | text | `Etapa`, ≤ 120 |
| `pavimento` | text | `Local`, ≤ 120 |
| `equipes` | text | `Equipe(s)` juntas, ≤ 200 |
| `saiu_em` | timestamptz null | Preenchido quando o pacote não vem na importação. Volta a `null` se ele reaparecer |
| `atualizado_em` | timestamptz | Última importação que trouxe o pacote |
| `resumo_ia` | jsonb null | `[{ "texto": string, "ncs": string[] }]` (d) |
| `resumo_assinatura` | text null | Hash das NCs que o resumo cobre |
| `resumo_em` | timestamptz null | Quando o resumo foi gerado |

### `ncs` (a)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | text PK | `Identificador Vínculo Problema` |
| `codigo_pacote` | text FK → `pacotes` ON DELETE CASCADE | |
| `id_item` | text | `Identificador Vínculo Item` |
| `item` | text | ≤ 200 |
| `origem` | text | `fvs` \| `fiscalizacao` |
| `tipo` | text | ≤ 200 |
| `descricao` | text | ≤ 500 |
| `sublocal` | text | `""` quando vazio ou "." |
| `prazo` | date null | |
| `data_correcao` | date null | |
| `situacao_item` | text | Situação mais recente do item (`REPROVADA`, `APROVADA`…), ≤ 40 |
| `ultima_inspecao` | timestamp null | Hora local da obra, sem fuso, como vem da planilha |
| `atualizado_em` | timestamptz | |

Uma NC que some da planilha enquanto o pacote continua nela fica gravada como estava. Na
prática, isso só acontece quando o pacote todo sai, e aí ele vai para Concluído.

### `marcacoes` (b)

| Campo | Tipo | Regra |
|---|---|---|
| `id_nc` | text PK, FK → `ncs` ON DELETE CASCADE | Uma marcação ativa por NC |
| `autor` | text | Nome informado, 1 a 60 caracteres |
| `em` | timestamptz | |

Desmarcar apaga a linha e grava um evento. A importação nunca escreve nesta tabela.

### `comentarios` (b)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | bigserial PK | |
| `codigo_pacote` | text FK → `pacotes` ON DELETE CASCADE | |
| `autor` | text | 1 a 60 |
| `texto` | text | 1 a 1000 |
| `em` | timestamptz | |

### `eventos` (c)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | bigserial PK | |
| `codigo_pacote` | text | **Sem FK**: o histórico sobrevive à exclusão do pacote |
| `id_nc` | text null | |
| `tipo` | text | Ver a lista abaixo |
| `detalhe` | jsonb | Antes e depois, ou contagens |
| `autor` | text | Nome informado, `importação` ou `dono` |
| `em` | timestamptz | |

Tipos de evento: `pacote_entrou`, `pacote_saiu`, `pacote_voltou`, `nc_entrou`,
`nc_situacao_mudou`, `nc_marcada`, `nc_desmarcada`, `comentario`, `resumo_ia_gerado`,
`pacote_excluido`.

### `importacoes` (c)

| Campo | Tipo |
|---|---|
| `id` | bigserial PK |
| `autor` | text |
| `em` | timestamptz |
| `contagens` | jsonb: `{ pacotes, novos, saidos, voltaram, ncs, ncsNovas, ncsMudaram }` |

## Regras calculadas (funções puras em `lib/dominio/`)

### Situação da NC

```text
situacaoItem != "REPROVADA" e ultimaInspecao presente  → Concluída
senão, dataCorrecao presente ou marcação ativa          → Corrigida
senão                                                   → Aberta
```

Um item que nunca foi inspecionado não gera NC, porque NC só nasce de inspeção reprovada.

### NCs visíveis no card

1. Pega as NCs não concluídas do pacote.
2. Se alguma for de fiscalização, mantém só as de fiscalização. Senão, mantém as de FVS.

### Coluna do pacote

```text
saiu_em preenchido           → Concluído
nenhuma NC visível           → Concluído
alguma NC visível Aberta     → Aberto
senão                        → Corrigido
```

### Linhas do card (resumo local)

- Agrupa as NCs visíveis por `item`, sem diferenciar acentos e maiúsculas.
- Cada linha mostra `item (juntarLocais(sublocais)) ×n`, com os campos já formatados pelas regras de
  [contracts/planilha.md](contracts/planilha.md#formatação-para-o-card). Os halls são juntos como os apartamentos: `HALL A-B`. Sem local, mostra só `×n`. Com uma
  só NC, não mostra a contagem.
- Os grupos são ordenados do maior para o menor, e não há limite de linhas.

### Resumo da IA válido para exibição

- `resumo_assinatura` é igual a `assinatura(NCs visíveis)`.
- `assinatura` é o SHA-256 da lista ordenada de `id|item|descricao|sublocal` das NCs visíveis.
- A situação **não** entra na assinatura. Marcar uma NC como corrigida não invalida o resumo, porque ela continua no card. Quando uma NC é concluída ou aparece uma nova, o conjunto de ids muda e o resumo é invalidado.

## Transições de importação

Tudo dentro de uma transação, com `pg_advisory_xact_lock`:

1. Faz upsert dos pacotes recebidos. Se o pacote não existia, grava `pacote_entrou`. Se estava
   com `saiu_em`, volta `saiu_em` a `null` e grava `pacote_voltou`.
2. Faz upsert das NCs recebidas. Se a NC não existia, grava `nc_entrou`. Se a situação calculada
   mudou, grava `nc_situacao_mudou` com o antes e o depois.
3. Pacotes guardados com `saiu_em` nulo que não vieram na importação recebem `saiu_em = agora` e
   o evento `pacote_saiu`.
4. Grava a linha em `importacoes`.

`marcacoes` e `comentarios` não são tocadas (FR-015). Reimportar a mesma planilha não gera
nenhum evento.
