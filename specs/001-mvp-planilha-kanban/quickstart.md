# Quickstart: validar o MVP

## Pré-requisitos

- Node 20 e `npm install`.
- Para os testes, nada mais: o banco roda em memória, com o PGlite.
- Para rodar o site local: um banco Postgres (o branch de desenvolvimento do Neon serve) e o
  `.env.local` com:

```bash
DATABASE_URL=postgres://...      # URL com pooling do Neon
SENHA_EQUIPE=...
SENHA_DONO=...                   # diferente da senha da equipe
SEGREDO_SESSAO=...               # 32+ caracteres aleatórios
LLM_API_KEY=...                  # opcional: sem ela, o card fica com o resumo local
# LLM_BASE_URL e LLM_MODEL são opcionais, como hoje
```

## 1. Portões automáticos (antes de todo push)

```bash
npx vitest run      # todos verdes
npx tsc --noEmit    # sem erro
npx next build      # build ok
```

## 2. Banco

```bash
npm run db:migrar   # aplica db/schema.sql; rodar duas vezes não dá erro
```

## 3. Cenários manuais (`npm run dev`, http://localhost:3000)

| # | Passo | Esperado |
|---|---|---|
| 1 | Abrir o site sem sessão | Tela de senha. `GET /api/pacotes` responde 401 |
| 2 | Entrar com `SENHA_EQUIPE`, informar o nome e importar `BaseDeDadosInspecoes_45138.xlsx` | Kanban com cerca de 73 pacotes e nenhuma NC repetida. Na aba Rede do DevTools, o arquivo `.xlsx` não aparece em nenhuma requisição, só o JSON de `POST /api/importacoes` (SC-004) |
| 3 | Importar a mesma planilha de novo | Contagens `novos: 0, saidos: 0, ncsMudaram: 0`. Nenhum card muda (SC-003) |
| 4 | Marcar uma NC aberta e comentar, depois reimportar | A NC continua Corrigida e o comentário e o histórico continuam lá |
| 5 | Abrir um card com muitos itens | O card cresce na altura, a largura não muda e não há rolagem horizontal no celular (DevTools, 360 px) |
| 6 | Expandir um grupo | Aparece a lista das NCs daquele item |
| 7 | Baixar o CSV e colar em B2 da aba NCs da planilha de controle | Colunas B a K batem ([exportacao.md](contracts/exportacao.md)) |
| 8 | Com a sessão da equipe, chamar `POST /api/pacotes/<codigo>/resumo` | 403 (SC-005) |
| 9 | Entrar com `SENHA_DONO` e gerar o resumo de um card | O card fica mais curto e todo local que estava no resumo local continua aparecendo (SC-006, SC-007) |
| 10 | Tirar a `LLM_API_KEY` e gerar o resumo | Aparece o aviso e o card fica com o resumo local |
| 11 | No celular usado na obra, importar a planilha real | O kanban aparece em menos de 1 minuto (SC-001) |
| 12 | Percorrer o kanban só com o teclado | Todos os botões e campos são alcançáveis e têm rótulo |

## 4. Limpeza (SC-008)

```bash
grep -rniE "pdfjs|jszip|pdf\.worker|SITE_PASSWORD|extrairLocal|classify|lib/llm|checarSenha" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=specs --exclude-dir=.claude --exclude-dir=.specify . || echo "limpo"
```

O esperado é que o comando imprima `limpo`.
