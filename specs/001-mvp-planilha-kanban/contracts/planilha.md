# Contrato: entrada da planilha (Princípio IV)

Travado por `lib/planilha/ler.test.ts` e `lib/planilha/importar.test.ts`.

## Arquivo

- Formato `.xlsx`, com a aba **"Base de Dados de Inspeções"**. Se a aba não existir, a
  importação é recusada com: `A planilha não tem a aba "Base de Dados de Inspeções".`
- A linha do cabeçalho é a primeira que contém a célula `Código Pacote`. Na exportação atual,
  é a linha 2.
- O cabeçalho tem que trazer as 29 colunas, pelo nome exato (depois de tirar os espaços das
  pontas), em qualquer ordem:

`Nº Inspeção`, `Código Pacote`, `N° da Predecessão`, `Tarefa`, `Etapa`, `Endereço`, `Local`,
`Sublocal`, `% Acumulado`, `Status`, `Situação do Pacote`, `Identificador Vínculo Ficha`,
`Descrição FVS`, `Agrupamento de FVS`, `Situação FVS`, `Identificador Vínculo Item`,
`Descrição Item Inspeção`, `Situação do Item`, `Identificador Histórico Item`, `Data Inspeção`,
`Usuário Inspeção`, `Identificador Vínculo Problema`, `Tipo de Não Conformidade`,
`Descrição Problema`, `Ações Tomadas`, `Data Prevista Correção`, `Data Real Correção`,
`Equipe(s)`, `Colaborador NC`.

- Se faltar coluna, a importação é recusada inteira, com `Falta a coluna "<nome>" na planilha.`
  Se faltarem várias: `Faltam as colunas "<a>", "<b>" na planilha.`
- Se nenhuma linha tiver `Código Pacote`: `A aba "Base de Dados de Inspeções" não tem a linha de
  cabeçalho (com "Código Pacote").`
- Se o arquivo não puder ser lido: `O arquivo não é uma planilha .xlsx.` (um arquivo de texto
  pode ser lido como planilha sem a aba; aí vale a mensagem da aba).
  Colunas a mais são ignoradas.

## Linhas

| Caso | Tratamento |
|---|---|
| Todas as células vazias | Ignorada |
| `Código Pacote` não é só dígitos (ex.: rodapé "MENTOR CONSTRUÇÃO / PLANEJE TECNOLOGIA") | Ignorada |
| Sem `Identificador Vínculo Problema` | Não gera NC. Entra só no cálculo da situação do item |
| Sem `Data Inspeção` | Não entra no cálculo da situação do item |
| Mesma NC em várias linhas | Vira um registro só. Os campos vêm da linha com a maior `Data Inspeção` |

## Normalização

- Texto: espaços repetidos viram um só e as pontas são aparadas. `"."` vira `""`.
- Data: aceita `dd/mm/aaaa` e `dd/mm/aaaa hh:mm:ss`. A data vai como `aaaa-mm-dd` e a data com
  hora como ISO. Valor inválido vira `null`, sem erro.
- Situação do item: maiúsculas, sem espaços nas pontas.
- Origem: `fiscalizacao` se a `Descrição FVS` contém `FISCALIZAÇÃO`, sem diferenciar maiúsculas
  e acentos. Senão, `fvs`.
- Ordem das inspeções do item: maior `Data Inspeção`. No empate, maior `Identificador Histórico
  Item` (numérico).

## Formatação para o card

Regras aprovadas pelo dono em 2026-11-23, a partir da planilha real. Cada exemplo vira um caso
de teste em `lib/dominio/normalizar.test.ts`.

Os valores vão ao servidor **já formatados**. O `tarefa` original não é guardado.

| Campo | Regra | Exemplos (planilha → card) |
|---|---|---|
| Serviço (`Tarefa`) | Tira o código do começo (`4828 - `) e o `SERVIÇO [DE] [EXECUÇÃO DE]`. Corta no primeiro ` - ` ou `(`. Só a primeira letra fica maiúscula | `4828 - SERVIÇO DE EXECUÇÃO DE ALVENARIA - 15CM PAVTO TIPO - …` → `Alvenaria`; `4827 - SERVIÇO DE EXECUÇÃO DE GRAUTEAMENTO DA ALVENARIA - …` → `Grauteamento da alvenaria`; `4784 - INDUSTRIALIZAÇÃO DE LAJE PRÉ MOLDADA (PRODUÇÃO…)` → `Industrialização de laje pré moldada` |
| Pavimento (`Local`) | Se contém `térreo` → `TÉRREO`. Se contém `<n> º Pav` → `<n>º PAV.`. Senão, o texto como veio | `3 º Pavimento - 3` → `3º PAV.`; `PAVIMENTO TÉRREO - 1` → `TÉRREO`; `Alvenaria 3 º Pav - b7 - 3` → `3º PAV.`; `RADIER - 12` → `RADIER - 12` |
| Empresa (`Equipe(s)`) | Separa por vírgula, tira o código `<n>-` de cada parte, apara e põe em maiúsculas. Repetições exatas são removidas e os nomes diferentes são separados com ` / `. **Erros de digitação não são corrigidos** | `7841-RPR` → `RPR`; `16044-EJL ,7839-EJL` → `EJL`; `3457-FORCE ONE,7565-NO PRUMO,7566-FORCE ONE` → `FORCE ONE / NO PRUMO`; `16054-NOPRUMO,7849-NO PRUMO` → `NOPRUMO / NO PRUMO` |
| Item (`Descrição Item Inspeção`) | Tira o código do começo | `364 - Esquadro entre alvenarias` → `Esquadro entre alvenarias` |
| Sublocal | 1) Apara e tira os pontos das pontas; `.` vira vazio. 2) Tira a porcentagem (`95%`, `_ 95%`, `-95%`). 3) Tira o prefixo `BL\|BLOCO <n> - <n>° PAV\|Térreo - `. 4) `AP`, `Apto`, `Apartamento` + número → `AP <n>`, sem zeros à esquerda. 5) `hall <letra>` → `HALL <LETRA>`. 6) Senão, o texto em maiúsculas | `BL 6 - 3° PAV - AP 01 95%` → `AP 1`; `BL 6 - 3° PAV - AP 08_ 95%` → `AP 8`; `BLOCO 3 - 3° PAV - AP7 -95%` → `AP 7`; `apto 4 95%` → `AP 4`; `Apartamento 2` → `AP 2`; `AP03` → `AP 3`; `hall b` → `HALL B`; `.` → `` |

### Junção dos locais na linha do card (`juntarLocais`)

- Os apartamentos são juntos em ordem numérica: `AP 1-2-3`.
- Os halls também são juntos, em ordem de letra: `HALL A-B` quando aparecem os dois, `HALL A`
  quando só um.
- Os outros locais vêm depois, na ordem em que apareceram, sem repetição.
- Exemplo: `AP 1`, `AP 3`, `HALL B`, `AP 2`, `HALL A`, `ESCADA` → `AP 1-2-3, HALL A-B, ESCADA`.

### Card de referência (pacote 144683 da amostra, resumo local)

```text
ORIGEM: FISCALIZAÇÃO | EMPRESA: RPR
Bloco 6 · 3º PAV.
Alvenaria
- Esquadro entre alvenarias (AP 1-2-3-4-5-6-7-8, HALL A-B) ×22
- Planicidade (AP 1-2-3-4-5-6-7-8, HALL A-B) ×20
- Juntas (argamassa) Verticais e Horizontais (AP 1-2-3-4-5-6-7-8, HALL A-B) ×11
- Amarrações/Modulação (AP 1-2-3-4-5-6-7-8, HALL B) ×10
- Integridade (AP 1-2-3-4-5-6-7-8, HALL A) ×9
- Largura das Janelas conforme projeto (AP 1-2-3-4-5-6-7-8) ×8
- Dimensão interna dos Ambientes (AP 3-4, HALL A) ×3
- Limpeza Final (AP 7-8) ×2
- Altura do passa prato (AP 3) ×2
- Trupico nas PJ's (AP 4)
PRAZO: 21/10/2026
```

Esse pacote também tem 18 NCs de FVS abertas, que **não aparecem**: enquanto houver NC de
fiscalização não concluída, o card mostra só as de fiscalização (confirmado pelo dono). A fixture
anonimizada MUST reproduzir esse caso.

**Limites conhecidos**: alguns sublocais raros ficam como vieram, em maiúsculas: `Apto 2 - AP
1/2/3`, um número sozinho como `4` e `LAJE BLOCO 3`. Se aparecerem com frequência, entram em
regras novas.

## Saída (o que vai para `POST /api/importacoes`)

Os campos e o porquê de cada um estão em `research.md` R5. O formato está em `api.md`.
