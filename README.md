# Resumo de NCs

Site para acompanhar as não conformidades (NCs) da obra a partir da planilha diária de inspeções.

> **Em construção.** O envio de PDF das fichas foi removido. Já funcionam a importação da
> planilha, o kanban, as marcações e os comentários; exportação e IA estão chegando. A especificação está em
> `specs/001-mvp-planilha-kanban/`.

## Importar a planilha

1. Exporte do sistema de inspeção a planilha **"Base de Dados de Inspeções"** (`.xlsx`).
2. No site, entre com a senha e escolha o arquivo em **Planilha de inspeções (.xlsx)**.
3. Aparece um card por pacote, com os problemas agrupados por item de inspeção, os locais e a
   contagem (ex.: "Esquadro entre alvenarias (AP 1-2-3, HALL A-B) ×19"). Toque numa linha para ver
   as NCs dela.

Cada importação é gravada no servidor e o quadro fica igual para todos, em qualquer aparelho. Os
pacotes ficam num kanban **Aberto → Corrigido → Concluído**, na coluna da NC menos avançada:

- **Concluída**: a inspeção mais recente do item não é `REPROVADA` (aprovada, aprovada após
  inspeção ou "não se aplica"). A NC sai do card e fica no histórico.
- **Corrigida**: o item continua reprovado, mas tem `Data Real Correção` ou foi marcado pela equipe.
- **Aberta**: os demais casos.

Um pacote que estava no quadro e não veio na planilha do dia vai para Concluído, com a data em que
saiu (a planilha só traz pacotes reprovados). Importar a mesma planilha de novo não duplica nada.

Em cada card, a equipe marca as NCs corrigidas (ou usa **Mover para Corrigido**, que marca todas as
abertas), comenta e vê o **Histórico**, sempre com o nome e o horário. A importação seguinte não
apaga nada disso.

**O arquivo é lido no seu aparelho e não sai dele.** Se faltar alguma das 29 colunas, a
importação é recusada inteira, com o nome da coluna que falta. Quando um pacote tem NC de
fiscalização aberta, o card mostra só as de fiscalização; as de FVS aparecem quando a
fiscalização termina.

### O que vai para o servidor

Só estes campos, já formatados: código, serviço, bloco, pavimento e empresa do pacote; e, de cada
NC, o identificador, o item de inspeção, a origem (FVS ou fiscalização), o tipo, a descrição, o
local, o prazo, a data real de correção e a situação e a data da inspeção mais recente do item.
**Não saem** os nomes de inspetores e colaboradores (`Usuário Inspeção`, `Colaborador NC`), o
endereço, as ações tomadas, nem os itens sem NC. Além disso vão o nome que a pessoa informou, para
o histórico, e os comentários que ela escrever.

## Acesso

Há dois níveis, verificados no servidor:

- **Equipe**: senha compartilhada (`SENHA_EQUIPE`). Antes da primeira mudança, a pessoa informa o
  nome, que vai para o histórico (não é conferido).
- **Dono**: senha própria (`SENHA_DONO`), que libera também a IA e a exclusão definitiva.

A sessão fica num cookie assinado com `SEGREDO_SESSAO` e dura 12 horas. Se alguma dessas três
variáveis faltar, se o segredo tiver menos de 32 caracteres ou se as duas senhas forem iguais,
**ninguém entra** (o site responde "Acesso não configurado no servidor.").

## Rodar no seu computador

```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL, SENHA_EQUIPE, SENHA_DONO e SEGREDO_SESSAO
node --env-file=.env.local scripts/migrar.mjs   # cria as tabelas (pode rodar de novo sem problema)
npm run dev                  # http://localhost:3000
npm test                     # testes (Vitest)
```

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Banco Postgres (Neon), URL com pooling |
| `SENHA_EQUIPE` | Senha da equipe |
| `SENHA_DONO` | Senha do dono (diferente da da equipe) |
| `SEGREDO_SESSAO` | Assina o cookie de sessão; 32+ caracteres aleatórios (`openssl rand -base64 48`) |

No Vercel, crie o banco pelo marketplace (**Storage → Neon**) e ligue ao projeto: isso cria a
`DATABASE_URL`. Rode `npm run db:migrar` com essa URL uma vez (e de novo sempre que o
`db/schema.sql` mudar). As outras variáveis ficam em **Settings → Environment Variables**
(Production e Preview). **Nunca
commite o `.env.local`.**

## Estrutura

```
app/              páginas e rotas da API (Next.js App Router)
components/       interface (cards, kanban, importação, login)
lib/dominio/      regras puras: normalização, situação, agrupamento (interface e servidor)
lib/planilha/     leitura da planilha, só no navegador
lib/servidor/     banco, sessão e validação, só no servidor
db/schema.sql     tabelas do banco
tests/fixtures/   planilha fictícia usada nos testes
specs/            especificação, plano e tarefas (Spec Kit)
```
