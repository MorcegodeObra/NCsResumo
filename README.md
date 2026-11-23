# Resumo de NCs

Site para acompanhar as não conformidades (NCs) da obra a partir da planilha diária de inspeções.

> **Em construção.** O envio de PDF das fichas foi removido. A nova versão importa a planilha
> "Base de Dados de Inspeções" exportada pelo sistema de inspeção e mostra os pacotes num kanban
> (Aberto → Corrigido → Concluído). A especificação está em `specs/001-mvp-planilha-kanban/`.

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
app/        páginas e rotas da API (Next.js App Router)
specs/      especificação, plano e tarefas (Spec Kit)
```
