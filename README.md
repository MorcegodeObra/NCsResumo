# Resumo de NCs

Site para acompanhar as não conformidades (NCs) da obra a partir da planilha diária de inspeções.

> **Em construção.** O envio de PDF das fichas foi removido. A nova versão importa a planilha
> "Base de Dados de Inspeções" exportada pelo sistema de inspeção e mostra os pacotes num kanban
> (Aberto → Corrigido → Concluído). A especificação está em `specs/001-mvp-planilha-kanban/`.

## Importar a planilha

1. Exporte do sistema de inspeção a planilha **"Base de Dados de Inspeções"** (`.xlsx`).
2. No site, entre com a senha e escolha o arquivo em **Planilha de inspeções (.xlsx)**.
3. Aparece um card por pacote, com os problemas agrupados por item de inspeção, os locais e a
   contagem (ex.: "Esquadro entre alvenarias (AP 1-2-3, HALL A-B) ×19"). Toque numa linha para ver
   as NCs dela.

**O arquivo é lido no seu aparelho e não sai dele.** Se faltar alguma das 29 colunas, a
importação é recusada inteira, com o nome da coluna que falta. Quando um pacote tem NC de
fiscalização aberta, o card mostra só as de fiscalização; as de FVS aparecem quando a
fiscalização termina.

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
cp .env.example .env.local   # preencha SENHA_EQUIPE, SENHA_DONO e SEGREDO_SESSAO
npm run dev                  # http://localhost:3000
npm test                     # testes (Vitest)
```

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `SENHA_EQUIPE` | Senha da equipe |
| `SENHA_DONO` | Senha do dono (diferente da da equipe) |
| `SEGREDO_SESSAO` | Assina o cookie de sessão; 32+ caracteres aleatórios (`openssl rand -base64 48`) |

No Vercel, cadastre em **Settings → Environment Variables** (Production e Preview). **Nunca
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
