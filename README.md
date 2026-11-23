# Resumo de NCs

Site para acompanhar as não conformidades (NCs) da obra a partir da planilha diária de inspeções.

> **Em construção.** O envio de PDF das fichas foi removido. A nova versão importa a planilha
> "Base de Dados de Inspeções" exportada pelo sistema de inspeção e mostra os pacotes num kanban
> (Aberto → Corrigido → Concluído). A especificação está em `specs/001-mvp-planilha-kanban/`.

## Rodar no seu computador

```bash
npm install
npm run dev                  # http://localhost:3000
```

## Estrutura

```
app/        páginas e rotas da API (Next.js App Router)
specs/      especificação, plano e tarefas (Spec Kit)
```
