# Research: MVP — Planilha de Inspeções e Kanban de Pacotes

Decisões da Fase 0. Cada uma resolve uma incógnita do Technical Context do `plan.md`.

## R1. Leitura do `.xlsx` no navegador

- **Decision**: SheetJS Community Edition (`xlsx`), instalado pelo tarball do CDN oficial
  (`https://cdn.sheetjs.com/xlsx-<versão>/xlsx-<versão>.tgz`, versão ≥ 0.20.3). A aba é lida com
  `sheet_to_json(ws, { header: 1, raw: false, defval: "" })`, que devolve as células como texto.
  As linhas vazias são descartadas logo na leitura.
- **Rationale**: lê a exportação real (strings compartilhadas, cerca de 524 mil linhas declaradas
  e só 6.300 úteis) sem precisar escrever um parser de XML. Ela também **escreve** `.xlsx`, o que
  deixa os testes montarem a planilha anonimizada na memória, sem versionar arquivo binário. A
  versão do registro npm (0.18.5) está parada e tem vulnerabilidades conhecidas. A do CDN é a
  mantida.
- **Alternatives considered**: `jszip` + `DOMParser` (já instalado, mas exige escrever e testar um
  leitor de OOXML, e o `jszip` sai junto com o PDF); `exceljs` (pesado demais para o navegador);
  `read-excel-file` (não escreve `.xlsx`, então os testes precisariam de binário versionado).
- **Shortcut**: a leitura roda na thread principal, com o estado "lendo…". Se num celular medido
  passar de 3 s, a leitura passa para um Web Worker.

## R2. Banco de dados

- **Decision**: Postgres gerenciado do Neon, pelo marketplace do Vercel, acessado com o driver
  `postgres` (postgres.js) pela URL com pooling (`DATABASE_URL`). O SQL é escrito à mão, com
  parâmetros. O esquema fica num `db/schema.sql` idempotente, aplicado por `npm run db:migrar`.
- **Rationale**: decisão do dono (Postgres). O `sql.begin()` do postgres.js dá a transação de que
  a importação tudo ou nada precisa (FR-016). São 6 tabelas pequenas, então um ORM não compensa.
- **Alternatives considered**: Drizzle ORM (dependência e camada a mais para 6 tabelas);
  `@neondatabase/serverless` em HTTP (transação só em lote, sem interatividade, e a importação
  precisa ler o estado antes de gravar); KV/Blob (não tem transação nem consulta).

## R3. Banco nos testes

- **Decision**: PGlite (`@electric-sql/pglite`, Postgres compilado para WASM) como dependência de
  desenvolvimento. O repositório recebe um objeto `Banco` com duas funções, `consulta(sql, params)`
  e `transacao(fn)`. Em produção ele é implementado com o postgres.js. Nos testes, com o PGlite
  em memória e o mesmo `schema.sql`.
- **Rationale**: os testes rodam o SQL real (upsert, `ON CONFLICT`, transação) sem Docker nem
  conta na nuvem, e o `vitest run` continua sendo um comando só.
- **Alternatives considered**: mock do banco (não testa o SQL, que é onde a importação pode errar);
  Postgres em Docker (mais um pré-requisito na máquina e no CI).

## R4. Autenticação em dois níveis

- **Decision**: duas senhas em variáveis de ambiente, `SENHA_EQUIPE` e `SENHA_DONO`. A rota
  `POST /api/sessao` compara a senha em tempo constante e grava um cookie `sessao` HttpOnly,
  `Secure` e `SameSite=Lax`, com `papel.expiração.assinatura`. A assinatura é um HMAC-SHA256 com
  `SEGREDO_SESSAO`, calculado com `node:crypto`. Toda rota chama `exigirPapel(req, "equipe" | "dono")`.
  O dono passa em tudo que a equipe passa. O nome da pessoa fica no `localStorage` e vai no
  corpo de cada mudança.
- **Rationale**: cumpre a emenda 1.1.0 (senha compartilhada, nome informado e não conferido,
  credencial própria do dono) sem dependência nova nem tabela de usuários.
- **Alternatives considered**: Auth.js ou Clerk (servem para login individual, que ficou fora do
  MVP); senha num cabeçalho a cada requisição, como o `x-senha` de hoje (deixa a senha guardada no
  navegador e não expira).
- **Falha fechada**: se `SENHA_EQUIPE`, `SENHA_DONO` ou `SEGREDO_SESSAO` faltarem ou estiverem vazias, se
  `SEGREDO_SESSAO` tiver menos de 32 caracteres, ou se as duas senhas forem iguais, o servidor recusa
  todo login com `Acesso não configurado no servidor.`. Uma configuração incompleta nunca abre o site.
- **Shortcut**: o login não tem limite de tentativas. Basta enquanto o link circular só dentro da
  equipe. Se ele vazar, entra um limite por IP.

## R5. O que sai do navegador (Princípio I)

O navegador lê a planilha, deduplica e calcula a situação do item. Só os campos abaixo vão ao
servidor:

| Campo enviado | Coluna de origem | Por quê |
|---|---|---|
| `codigo` | `Código Pacote` | Identidade do pacote |
| `tarefa` | `Tarefa`, já reduzida ao serviço (ex.: `Alvenaria`) | Título do card |
| `bloco` | `Etapa` | Card e CSV (Bloco) |
| `pavimento` | `Local` | Card e CSV (Pavimento) |
| `equipes` | `Equipe(s)` (juntas, sem repetição) | Card e CSV (Empresa) |
| `id` | `Identificador Vínculo Problema` | Identidade da NC |
| `idItem` | `Identificador Vínculo Item` | Junta NCs do mesmo item |
| `item` | `Descrição Item Inspeção` | Agrupamento do card |
| `origem` | derivada de `Descrição FVS` | Regra FVS × fiscalização. Só o valor `fvs` ou `fiscalizacao` sai |
| `tipo` | `Tipo de Não Conformidade` | Lista expandida do grupo |
| `descricao` | `Descrição Problema` | Lista expandida e IA |
| `sublocal` | `Sublocal` | Locais do card |
| `prazo` | `Data Prevista Correção` | Prazo mais próximo |
| `dataCorrecao` | `Data Real Correção` | Situação Corrigida |
| `situacaoItem` | `Situação do Item` da inspeção mais recente | Situação Concluída |
| `ultimaInspecao` | `Data Inspeção` da inspeção mais recente | Ordem e histórico |

**Não saem**: `Usuário Inspeção` e `Colaborador NC` (nomes de pessoas, que nenhuma regra usa),
`Endereço`, `Ações Tomadas`, os identificadores de ficha e de histórico, as porcentagens e os
status gerais. Os itens sem NC também ficam no navegador: só servem para calcular a situação do
item.

## R6. Situação, coluna e filtro de origem

- **Decision**:
  - A situação da NC é calculada numa função pura (`situacaoNC`), usada na interface e no
    servidor. Ela não é gravada.
  - A coluna do pacote também é calculada (`colunaDoPacote`): Concluído se `saiu_em` estiver
    preenchido; senão, a coluna da NC menos avançada.
  - O filtro de origem vale para as NCs **não concluídas**: se houver alguma de fiscalização,
    o card e a coluna usam só as de fiscalização; senão, usam as de FVS.
- **Rationale**: gravar estados derivados permitiria que eles divergissem dos dados. Aplicar o
  filtro só às NCs não concluídas evita que um pacote com a fiscalização toda aprovada e uma FVS
  aberta apareça vazio ou em Concluído.
- **Alternatives considered**: guardar uma coluna `situacao` (fica errada se a regra mudar ou se
  uma marcação for desfeita); aplicar o filtro a todas as NCs (o caso acima esconderia a FVS
  aberta).

## R7. "Mover pacote para Corrigido"

- **Decision**: mover o pacote marca como corrigidas, numa transação, todas as NCs abertas que o
  card mostra. Não existe um estado separado para o pacote.
- **Rationale**: uma regra só. A coluna continua sendo derivada das NCs.

## R8. IA sem perder NC nem local

- **Decision**:
  - O servidor carrega do banco as NCs não concluídas do pacote. Não usa o que o navegador
    mandaria.
  - A IA recebe essas NCs com ids curtos (`n1`, `n2`…) e devolve
    `{ "linhas": [{ "texto": "...", "ncs": ["n1", "n4"] }] }`.
  - O servidor aceita a resposta só se a união dos `ncs` for exatamente o conjunto enviado, sem
    id inventado. A IA escreve só o texto do problema.
  - Os locais e a contagem de cada linha são montados pelo servidor, com `juntarLocais` e o
    total, a partir das NCs citadas.
  - O resumo é gravado com uma `assinatura`, um hash dos ids e dos campos das NCs. O card só
    exibe o resumo enquanto a assinatura bater com a atual.
- **Rationale**: a garantia de "nenhum local perdido" (FR-023, SC-006) passa a ser calculada,
  não depende da IA. Como cada linha aponta para as suas NCs, o grupo da IA também pode ser
  expandido.
- **Alternatives considered**: procurar os locais dentro do texto da IA (frágil com "AP 1-2-3");
  confiar no texto livre (viola a regra "sem perda").
- Mantém o provedor compatível com OpenAI de `lib/llm.ts` (Groq por padrão). "Gerar todos" chama
  um pacote por vez, por causa do limite por minuto.

## R9. Testes

- **Decision**:
  - Vitest, com `environment: "node"` por padrão e `jsdom` por arquivo nos testes de componente.
  - `@testing-library/react` (com o par `@testing-library/dom`) para a interface.
  - Alias `@/` configurado no `vitest.config.ts`.
  - Testes ao lado do código (`*.test.ts(x)`).
  - Fixture anonimizada em `tests/fixtures/planilha.ts`, como lista de linhas. Os testes montam o
    `.xlsx` com o SheetJS na hora.
- **Rationale**: o Princípio III exige Vitest e fixtures anonimizadas. Gerar o arquivo na hora
  testa o caminho de leitura de verdade sem versionar planilha (`*.xlsx` está no `.gitignore`).

## R10. Limpeza do repositório

- **Decision**: remover `lib/pdf.ts`, `lib/pdfjs.d.ts`, `lib/classify.ts`, `lib/extrairLocal.ts`,
  `lib/types.ts`, `scripts/copiar-worker.mjs`, `public/pdf.worker.min.mjs`, o `postinstall` e as
  dependências `pdfjs-dist` e `jszip`. Também remover `SITE_PASSWORD` e `checarSenha`.
  `lib/agrupar.ts` vira `lib/dominio/agrupar.ts`, só com o que continua em uso (`juntarLocais`,
  `menorPrazo`). O agrupamento local deixa de cortar em 3 linhas, porque o card agora tem altura
  variável. `app/page.tsx`, com 344 linhas, é substituído por componentes pequenos.
- **Rationale**: FR-027, FR-028 e SC-008.
- **Atualizado na implementação (T002)**: o `npm audit` mostrou vulnerabilidades críticas no Next
  14.2.35, que só têm correção a partir do Next 16. Como quase todo o código é reescrito nesta
  feature, o dono decidiu migrar para o Next 16 e o React 19 já na T002. As rotas dinâmicas usam
  `params` assíncrono (`await params`).
