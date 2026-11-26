# Plano 005: arquivo, urgência, kanban fixo e visual novo

**Branch**: `005-arquivo-urgencia-visual` | **Data**: 2026-11-26 | **Spec**: [spec.md](spec.md)

## Resumo

O arquivo e a urgência seguem o caminho da conclusão da 004. Cada um tem a sua coluna no banco, uma rota só do dono,
um evento e uma regra calculada em `montarVisao`. O kanban continua recebendo todos os pacotes de uma vez e faz o
corte de 10 no navegador. O visual mexe no `globals.css`, no `Moldura` (navegação) e nos cards, com ícones do
`lucide-react`.

## Contexto técnico

- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Postgres (`postgres`), Vitest. Deploy no Vercel.
- **Dependência nova**: `lucide-react` (ícones em SVG, ISC; só os ícones importados entram no bundle).
- **Testes**: Vitest com `bancoDeTeste` para as rotas e Testing Library para os componentes; `maxWorkers: 2`.
- **Escala**: algumas centenas de pacotes. Mandar todos de uma vez continua bastando (research R3).
- **Restrições**: sem rolagem horizontal da página no celular (360 px); tudo funciona pelo teclado; tudo em português.

## Constitution Check

| Princípio | Situação |
|---|---|
| I Leitura local | Não muda; nenhum campo novo sai do navegador na importação. |
| II IA do dono | Não muda. |
| III Test-First | Testes de rota (403/404/409, eventos, reimportação) e de visão antes do código. |
| IV Contratos fixos | `contracts/api.md` desta spec registra as rotas e os campos novos de `PacoteVisao`. |
| V Planilha como fonte | **Emenda 1.5.0**: o arquivo (card e NC) e a urgência entram em (b), dados só pelo dono. A importação não os apaga; NC nova derruba o arquivo do card (como a conclusão). |
| Acesso | Rotas novas com `exigirPapel(req, "dono")`; `GET /api/pacotes` omite os arquivados para a equipe. |
| Dependências | Livres; `lucide-react` registrada aqui. |

Passa, com a emenda feita na própria branch. Revisto depois do desenho: continua passando.

## Estrutura (o que muda)

```text
back/db/schema.sql                      + arquivado_em, arquivado_ncs, urgente (pacotes); arquivada_em, criada_em (ncs)
back/dominio/visao.ts                   arquivadoEm, urgente, recenteEm, arquivadas; NC arquivada fora das visíveis
back/servidor/repositorio.ts            arquivar/desarquivar (card e NC), definirUrgencia; derrubar arquivo na importação
back/rotas/arquivo.ts, arquivoNc.ts, urgencia.ts  (+ .test.ts)
app/api/pacotes/[codigo]/arquivo/route.ts
app/api/pacotes/[codigo]/ncs/[id]/arquivo/route.ts
app/api/pacotes/[codigo]/urgencia/route.ts
back/rotas/pacotes.ts                   equipe não recebe arquivados
compartilhado/dominio/tipos.ts          campos novos de PacoteVisao e NCVisao
front/lib/api.ts                        arquivar, desarquivar, arquivarNc, desarquivarNc, definirUrgencia
front/componentes/Kanban.tsx            busca, 10 por coluna + Ver mais, urgentes primeiro, abas no celular
front/componentes/CartaoKanban.tsx      ícones, selo urgente
front/componentes/Ficha.tsx             botões de urgência e arquivo (card e NC), só para o dono
front/componentes/Arquivo.tsx + app/arquivo/page.tsx   página do dono
front/componentes/Moldura.tsx           barra de baixo (celular) e drawer (PC), com ícones
front/estilos/globals.css               layout de altura fixa, cartões, barra e drawer
.specify/memory/constitution.md         emenda 1.5.0
```

`Cards`, `Tabela` e a impressão filtram `!p.arquivadoEm`. A regra é a mesma do kanban.

## Artefatos

[research.md](research.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [quickstart.md](quickstart.md)
