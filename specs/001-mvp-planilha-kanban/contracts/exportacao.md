# Contrato: exportação (CSV, texto e impressão)

Travado por `lib/exportar.test.ts`. A exportação usa os pacotes das colunas Aberto e Corrigido,
com as NCs visíveis.

## CSV: colunas B a K da aba NCs da planilha de controle (colar a partir de B2)

O cabeçalho e a ordem são os mesmos do `cartoesParaCSV` de hoje. O separador é `;`, o arquivo
começa com BOM UTF-8, as linhas terminam com CRLF e toda célula vai entre aspas.

| Col. | Cabeçalho | Valor |
|---|---|---|
| B | Origem | `Qualidade` (fvs) ou `Fiscalização` |
| C | Empresa | `equipes` |
| D | Bloco | `bloco` sem o prefixo "Bloco " |
| E | Pavimento | `pavimento` |
| F | Serviço | `tarefa` |
| G | Resumo das NCs | linhas do card (IA ou local), separadas por quebra de linha |
| H | Prazo | menor prazo, `dd/mm/aaaa` |
| I | Etapa | `Aguardando NCs Qualidade` ou `Aguardando NCs Fiscalização` |
| J | Situação (0/1/2) | `0`, como hoje |
| K | Reconferências (0-3) | `0` |

Ainda falta conferir este formato com a planilha de controle real. A tarefa correspondente fica
no `tasks.md`.

## Texto (WhatsApp)

Mesmo formato do `cartaoParaTexto` de hoje: a linha `ORIGEM | EMPRESA`, o título
`bloco · pavimento`, a tarefa, `- linha` para cada linha do card e o rodapé `PRAZO | RESPONSÁVEL
| RECONFERIDA`. Os cards são separados por `--------------------`.

## Impressão

O navegador imprime os cards das colunas Aberto e Corrigido, sem o cabeçalho do site nem os
botões. A largura do card é fixa e a altura acompanha o conteúdo.
