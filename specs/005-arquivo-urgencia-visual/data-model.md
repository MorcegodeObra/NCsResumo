# Modelo de dados 005

## Banco (aditivo, `ADD COLUMN IF NOT EXISTS`)

| Tabela | Coluna | Tipo | Quem grava |
|---|---|---|---|
| pacotes | `arquivado_em` | `timestamptz` | dono (arquivar card); limpo ao desarquivar ou quando o arquivo deixa de valer |
| pacotes | `arquivado_ncs` | `jsonb NOT NULL DEFAULT '[]'` | NCs visíveis no momento em que o card foi arquivado |
| pacotes | `urgente` | `boolean NOT NULL DEFAULT false` | dono; volta a `false` quando o dono conclui ou arquiva |
| ncs | `arquivada_em` | `timestamptz` | dono (arquivar NC); a importação não mexe |
| ncs | `criada_em` | `timestamptz NOT NULL DEFAULT now()` | só o `INSERT` da importação |

## Regras em `montarVisao`

1. As NCs arquivadas uma a uma saem da conta das visíveis. A situação delas continua sendo calculada.
2. `arquivadas`: as NCs arquivadas uma a uma que a planilha ainda não concluiu.
3. `arquivadoEm` do card:
   - vale `arquivado_em` se as NCs visíveis de agora estão todas em `arquivado_ncs`;
   - se não há NC visível, mas há NCs em `arquivadas` e o pacote não saiu da planilha, vale a maior `arquivada_em`;
   - nos outros casos, `null`.
4. `coluna`: a mesma regra de hoje, calculada sobre as NCs visíveis. Um card arquivado continua com a sua coluna, mas
   as telas o tiram do kanban.
5. `urgente`: só é verdadeiro se `pacotes.urgente` está marcado, o card não está em Concluído e não está arquivado.
6. `recenteEm`: a maior `criada_em` entre as NCs visíveis (research R1).

## Transições

- Arquivar o card: precisa não estar arquivado (senão 409). Grava `arquivado_em`, `arquivado_ncs` e `urgente = false`.
- Desarquivar o card: apaga o arquivo do card **e** o das NCs arquivadas uma a uma, para que o card realmente volte
  ao kanban. Gera um evento para cada coisa desfeita.
- Arquivar uma NC: só uma NC visível do pacote (senão 409); 404 se a NC é de outro pacote.
- Desarquivar uma NC: só uma NC arquivada (senão 409).
- Na importação: o arquivo do card que deixou de valer é apagado, com o evento `pacote_desarquivado` e o autor
  "importação". O arquivo das NCs uma a uma fica como está.
- Urgência: um `PUT` com o mesmo valor que já está gravado não gera evento.

## Eventos (autor: dono, ou "importação")

`pacote_arquivado`, `pacote_desarquivado`, `nc_arquivada`, `nc_desarquivada` (com `id_nc`), `pacote_urgente`,
`pacote_nao_urgente`. O `Historico` ganha o texto de cada um.
