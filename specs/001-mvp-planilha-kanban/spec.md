# Feature Specification: MVP — Planilha de Inspeções e Kanban de Pacotes

**Feature Branch**: `001-mvp-planilha-kanban` (commits direto na `main`, conforme a constituição)

**Created**: 2026-11-23

**Status**: Draft (pronta para plano; emenda 1.1.0 aplicada)

**Input**: User description: "quero analisar baseado no codigo que temos e o constitution o que vamos precisar criar para montar um mvp"

## Contexto: o que já existe × o que a constituição pede

| Área | Hoje no código | Pedido para o MVP | Lacuna |
|------|----------------|-------------------|--------|
| Entrada | PDFs das fichas (ou `.zip`), lidos no navegador | Planilha "Base de Dados de Inspeções" exportada pelo sistema, lida no navegador. O PDF sai | Importação nova; remoção do fluxo de PDF |
| Identidade | Cartão por serviço + local, montado a partir do PDF | Pacote = `Código Pacote`; NC = `Identificador Vínculo Problema`, sem duplicar por reinspeção | Deduplicação e chaves novas |
| Origem | FVS × fiscalização pelo cabeçalho do PDF; opção de ignorar FVS | Por `Descrição FVS`; fiscalização substitui FVS no pacote, sempre | Regra fixa, não opcional |
| Card | `CartaoNC`, resumo em até 3 linhas, tamanho fixo | Um card por pacote, itens agrupados com locais e contagem, expansível; largura fixa e altura variável | Expandir grupos, situação, altura livre |
| IA | Resumo opcional por cartão, senha única opcional | Só o dono aciona; a IA funde itens parecidos dentro do card sem perder NC nem local; o resumo fica guardado e todos veem | Restringir ao dono, guardar resumo, regra "sem perda" |
| Situação / kanban | Não existe | Aberta / Corrigida / Concluída por NC; kanban Aberto → Corrigido → Concluído por pacote | Tudo novo |
| Persistência e histórico | Nada é guardado | Campos da planilha, acréscimos da equipe, resumo da IA e histórico | Tudo novo |
| Acesso | Senha única opcional, só na rota da IA | Senha da equipe + nome digitado; credencial própria do dono | Dois níveis verificados no servidor |
| Exportação | Copiar texto, CSV (B a K), imprimir | Mantida, vinda da planilha | Adaptar à nova fonte |
| Testes | Nenhum | Vitest obrigatório, fixtures anonimizadas | Base de testes do zero |
| Organização | Interface quase toda num só arquivo de página; código de PDF espalhado | Pasta limpa, só o necessário, frente e servidor separados em módulos | Reorganização (detalhada no plano) |

## O que a planilha real mostrou

Amostra analisada: `BaseDeDadosInspecoes_45138.xlsx` (não versionada; ignorada no git).

- Uma aba, "Base de Dados de Inspeções". A linha 1 é vazia e o **cabeçalho está na linha 2**, com as 29 colunas esperadas, na ordem: `Nº Inspeção`, `Código Pacote`, `N° da Predecessão`, `Tarefa`, `Etapa`, `Endereço`, `Local`, `Sublocal`, `% Acumulado`, `Status`, `Situação do Pacote`, `Identificador Vínculo Ficha`, `Descrição FVS`, `Agrupamento de FVS`, `Situação FVS`, `Identificador Vínculo Item`, `Descrição Item Inspeção`, `Situação do Item`, `Identificador Histórico Item`, `Data Inspeção`, `Usuário Inspeção`, `Identificador Vínculo Problema`, `Tipo de Não Conformidade`, `Descrição Problema`, `Ações Tomadas`, `Data Prevista Correção`, `Data Real Correção`, `Equipe(s)`, `Colaborador NC`.
- O arquivo declara cerca de 524 mil linhas, mas só cerca de 6.300 têm dados (73 pacotes, 1.006 NCs distintas).
- **O rodapé tem texto na coluna `Código Pacote`** ("MENTOR CONSTRUÇÃO / PLANEJE TECNOLOGIA", com a data e a hora em `Nº Inspeção`). A regra "ignorar linhas sem `Código Pacote`" não basta.
- A planilha traz **todos os itens inspecionados** dos pacotes reprovados, não só as NCs. Cerca de 5 mil linhas não têm `Identificador Vínculo Problema`: são itens sem NC ou reinspeções.
- Cada NC pertence a um único item (`Identificador Vínculo Item`). Entre as linhas de uma mesma NC, só variam a situação do item, a data e o usuário da inspeção.
- Situação mais recente do item de cada NC: 783 `REPROVADA`, 215 `APROVADO APÓS INSPECAO`, 6 `APROVADA`, 1 `NÃO SE APLICA`.
- 22 dos 73 pacotes têm NCs de FVS e de fiscalização ao mesmo tempo.
- Todo pacote vem com `Situação do Pacote` = `REPROVADA`, o que confirma que a planilha só traz pacotes reprovados.
- Cada pacote tem uma única `Tarefa`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Importar a planilha e ver os cards por pacote (Priority: P1)

Uma pessoa da equipe entra no site, escolhe a planilha exportada do sistema de inspeção e vê um
card por pacote, com tarefa, bloco, pavimento, equipe, prazo mais próximo e os problemas
agrupados por item de inspeção, com locais e contagem. O arquivo é lido no próprio aparelho.

**Why this priority**: troca os PDFs pela fonte oficial e entrega o resumo que a equipe usa no quadro.

**Independent Test**: importar uma planilha anonimizada com reinspeções, rodapé, sublocais vazios
ou "." e pacotes com FVS e fiscalização, e comparar cards, agrupamentos e contagens com o esperado.

**Acceptance Scenarios**:

1. **Given** uma planilha válida, **When** a pessoa a importa, **Then** aparece um card por `Código Pacote` com NC aberta ou corrigida, e cada NC é contada uma vez só, mesmo com várias linhas de reinspeção.
2. **Given** um pacote com NCs de FVS e de fiscalização, **When** o card é montado, **Then** só as de fiscalização aparecem.
3. **Given** 19 NCs do item "Esquadro entre alvenarias" em AP 1, AP 2, AP 3 e HALL A, **When** o card é exibido, **Then** aparece "Esquadro entre alvenarias (AP 1-2-3, HALL A) ×19", e ao expandir a linha a pessoa vê a lista das NCs.
4. **Given** uma planilha sem a coluna `Sublocal`, **When** importada, **Then** a importação é recusada inteira com a mensagem de que falta `Sublocal`.
5. **Given** o rodapé "MENTOR CONSTRUÇÃO / PLANEJE TECNOLOGIA" na coluna `Código Pacote`, **When** importada, **Then** o rodapé é ignorado sem erro.
6. **Given** um card com muitos grupos, **When** exibido, **Then** o card cresce na altura para mostrar todos, sem mudar a largura e sem rolagem horizontal.

---

### User Story 2 - Kanban dos pacotes que se mantém entre importações (Priority: P1)

A equipe importa a planilha todo dia e vê os pacotes num kanban com as colunas Aberto, Corrigido e
Concluído. Quem abrir o site depois, em qualquer aparelho, vê o mesmo estado. Cada importação
atualiza as NCs. Quando um item deixa de estar reprovado, a NC é concluída e sai do card. Pacotes
que não vieram no dia vão para Concluído com a data em que saíram.

**Why this priority**: é o acompanhamento contínuo que justifica o sistema (Princípio V). Entra no MVP.

**Independent Test**: importar a planilha do dia 1 e depois a do dia 2 (com uma NC aprovada, uma
com data de correção e um pacote ausente) e conferir a coluna de cada pacote e a situação de cada NC.

**Acceptance Scenarios**:

1. **Given** uma NC cujo item tem como inspeção mais recente `APROVADA`, `APROVADO APÓS INSPECAO` ou `NÃO SE APLICA` (qualquer situação que não seja `REPROVADA`), **When** a planilha é importada, **Then** a NC fica Concluída e sai da lista do card.
2. **Given** uma NC com `Data Real Correção`, cujo item continua `REPROVADA`, **When** importada, **Then** fica Corrigida.
3. **Given** um pacote com NCs Abertas e Corrigidas, **When** o kanban é exibido, **Then** o pacote está em Aberto.
4. **Given** um pacote em que todas as NCs foram concluídas, **When** a importação termina, **Then** o pacote vai para Concluído.
5. **Given** um pacote guardado que não veio na importação do dia, **When** a importação termina, **Then** o pacote vai para Concluído com a data de saída, e o histórico registra "importação" como autor.
6. **Given** a mesma planilha importada duas vezes, **When** a segunda termina, **Then** nada é duplicado e nada muda.

---

### User Story 3 - Equipe marca NCs como corrigidas e comenta (Priority: P1)

No celular, alguém da equipe abre um pacote, marca as NCs que já corrigiu (ou move o pacote
inteiro para Corrigido) e deixa um comentário. O histórico guarda o nome que a pessoa informou e
o horário, e a próxima importação não apaga essas marcações.

**Why this priority**: é o retorno de campo antes da reinspeção. Entra no MVP.

**Independent Test**: marcar uma NC e comentar, reimportar a mesma planilha e conferir que a
marcação, o comentário e o histórico continuam lá.

**Acceptance Scenarios**:

1. **Given** uma NC Aberta, **When** a pessoa a marca como corrigida, **Then** ela fica Corrigida e o histórico registra o nome da pessoa e o horário.
2. **Given** uma NC marcada pela equipe, **When** a planilha seguinte traz o item `APROVADA`, **Then** a NC fica Concluída e a marcação continua no histórico.
3. **Given** um pacote com marcações e comentários, **When** a planilha é reimportada, **Then** marcações e comentários continuam intactos.
4. **Given** uma pessoa que ainda não informou o nome, **When** ela tenta marcar uma NC, **Then** o site pede o nome antes de gravar.

---

### User Story 4 - Exportar o resumo (Priority: P2)

A pessoa copia o texto dos cards para o WhatsApp, baixa o CSV no formato da aba NCs da planilha de
controle (colunas B a K, colar a partir de B2) ou imprime.

**Why this priority**: a equipe depende disso hoje. Só muda a fonte.

**Independent Test**: com a planilha de teste importada, conferir o CSV coluna a coluna contra o modelo da aba NCs.

**Acceptance Scenarios**:

1. **Given** cards montados, **When** a pessoa baixa o CSV, **Then** o arquivo tem exatamente as colunas B a K, na ordem da planilha de controle, só com NCs não concluídas.

---

### User Story 5 - Dono gera cards compactos com IA e pode excluir pacotes (Priority: P2)

O dono entra com a própria credencial e pede à IA que resuma os cards. A IA lê todas as NCs do
pacote e funde itens de inspeção parecidos (ex.: prumo e esquadro de alvenaria) numa linha só,
para o card ficar mais curto, sem perder nenhuma NC nem nenhum local. O resumo fica guardado e
toda a equipe vê o card resumido no kanban. O dono também pode excluir um pacote de vez.

**Why this priority**: deixa o quadro mais legível, mas o resumo local já resolve o dia a dia.

**Independent Test**: com a credencial da equipe, tentar acionar a IA (o servidor recusa); com a
do dono, gerar o resumo e conferir que todas as NCs e todos os locais do pacote aparecem no
resultado; simular falha da IA e conferir que o card mantém o resumo local.

**Acceptance Scenarios**:

1. **Given** uma pessoa da equipe autenticada, **When** ela tenta acionar a IA por qualquer caminho, **Then** o servidor recusa.
2. **Given** o dono pede o resumo de um pacote, **When** a IA responde, **Then** o resumo só é aceito se cobrir todas as NCs não concluídas e todos os locais do pacote; senão o card fica com o resumo local.
3. **Given** um card resumido pela IA, **When** a equipe abre o kanban em outro aparelho, **Then** vê o mesmo resumo.
4. **Given** um card resumido, **When** uma importação muda as NCs daquele pacote, **Then** o resumo antigo deixa de ser exibido e o card volta ao resumo local até o dono gerar outro.
5. **Given** a IA fora do ar ou sem configuração, **When** o dono pede o resumo, **Then** o card mantém o resumo local, sem perder dados.
6. **Given** o dono exclui um pacote, **When** a exclusão termina, **Then** o pacote some do kanban e o histórico registra a exclusão.

---

### Edge Cases

- Cabeçalho fora da linha 1: o sistema procura a linha do cabeçalho em vez de assumir uma posição fixa.
- Planilha que declara centenas de milhares de linhas, quase todas vazias: as linhas vazias são descartadas sem travar o celular.
- Rodapé com texto em `Código Pacote`: ignorado, porque o código não é numérico.
- Itens sem NC (linhas sem `Identificador Vínculo Problema`): não geram NC, mas a situação deles vale como a inspeção mais recente do item.
- Item ainda não inspecionado (sem `Data Inspeção`): não muda a situação de nenhuma NC.
- `Sublocal` vazio ou "." conta como sem local: a NC entra na contagem, mas não na lista de locais.
- Datas com horário (`dd/mm/aaaa hh:mm:ss`), com espaços ou vazias são normalizadas; data inválida fica vazia sem derrubar a importação.
- Colunas fora de ordem, mas todas presentes: aceito (o contrato é pelo nome). Coluna a mais: ignorada. Coluna a menos: recusa tudo.
- Arquivo que não é planilha, ou sem a aba "Base de Dados de Inspeções": recusado com mensagem clara.
- Pacote em Concluído (por ter saído) que volta numa importação: vai para a coluna da sua NC menos avançada, com registro no histórico.
- Duas pessoas marcando o mesmo pacote ao mesmo tempo: as duas mudanças ficam no histórico, nenhuma se perde.
- Importação interrompida no meio: ou entra tudo, ou nada.
- A IA devolve um resumo que omite uma NC ou um local: o resumo é descartado e o card fica com o resumo local.

## Requirements *(mandatory)*

### Functional Requirements

**Importação da planilha**

- **FR-001**: O sistema MUST ler a planilha exportada pelo sistema de inspeção no aparelho da pessoa. O arquivo MUST NOT ir ao servidor; só saem os campos estruturados listados e justificados no plano.
- **FR-002**: O sistema MUST localizar a linha do cabeçalho da aba "Base de Dados de Inspeções", validar as 29 colunas pelo nome e recusar a importação inteira se faltar alguma, dizendo qual.
- **FR-003**: O sistema MUST ignorar linhas vazias e linhas cujo `Código Pacote` não seja um código numérico (como o rodapé).
- **FR-004**: O sistema MUST juntar as linhas de uma mesma NC num registro único e determinar a situação do item pela inspeção mais recente (maior `Data Inspeção`), considerando também as linhas do mesmo item sem NC.
- **FR-005**: O sistema MUST normalizar textos (espaços, "." como vazio) e datas (`dd/mm/aaaa`, com ou sem horário).
- **FR-006**: O sistema MUST classificar cada NC como fiscalização (`Descrição FVS` contém `FISCALIZAÇÃO`) ou FVS (contém `FVS`), e no card de um pacote com fiscalização mostrar só as de fiscalização.

**Card**

- **FR-007**: O sistema MUST mostrar um card por pacote com tarefa, bloco (`Etapa`), pavimento (`Local`), equipe, prazo mais próximo e situação.
- **FR-008**: O card MUST agrupar as NCs não concluídas por item de inspeção, com os locais (`Sublocal`) e a contagem, e cada grupo MUST poder ser expandido para mostrar a lista de NCs.
- **FR-009**: O card MUST ter largura fixa e altura variável, mostrando o resumo completo sem cortar linhas.

**Kanban, situação e histórico**

- **FR-010**: O sistema MUST guardar, entre importações e entre aparelhos: os campos estruturados da NC e do pacote, as marcações e os comentários da equipe, o resumo da IA de cada card e o histórico de mudanças. Nada além disso.
- **FR-011**: A situação de cada NC MUST ser: **Concluída** quando a inspeção mais recente do item não é `REPROVADA`; **Corrigida** quando o item continua `REPROVADA` mas há `Data Real Correção` ou marcação da equipe; **Aberta** nos demais casos.
- **FR-012**: NCs concluídas MUST sair da lista do card e continuar no histórico.
- **FR-013**: Cada pacote MUST ficar na coluna da sua NC menos avançada (Aberto → Corrigido → Concluído). Pacote sem NC aberta nem corrigida fica em Concluído.
- **FR-014**: Ao importar, o sistema MUST levar para Concluído, com a data de saída, todo pacote guardado que não veio na planilha do dia.
- **FR-015**: Reimportar MUST atualizar sem duplicar, e MUST NOT apagar nem sobrescrever marcações e comentários da equipe.
- **FR-016**: A importação MUST ser tudo ou nada.
- **FR-017**: Toda mudança, da equipe, da importação ou do dono, MUST ficar no histórico com autor (nome informado, "importação" ou "dono") e data e hora.
- **FR-018**: A equipe MUST poder marcar NCs como corrigidas, mover um pacote para Corrigido e comentar.

**Exportação**

- **FR-019**: O sistema MUST permitir copiar o texto dos cards, baixar o CSV com as colunas B a K da aba NCs da planilha de controle e imprimir.

**Acesso**

- **FR-020**: Todo acesso a dados guardados MUST exigir autenticação verificada no servidor, em dois níveis: **equipe**, com senha compartilhada, e **dono**, com credencial própria.
- **FR-021**: Antes da primeira marcação, a pessoa da equipe MUST informar o nome. Esse nome é o que vai para o histórico e não é conferido pelo sistema.

**IA (só o dono)**

- **FR-022**: Só o dono MUST poder acionar a IA. O servidor MUST recusar qualquer tentativa com a credencial da equipe.
- **FR-023**: A IA MUST receber as NCs não concluídas do pacote e devolver um resumo que funde itens de inspeção parecidos, dentro do mesmo card. O resumo MUST ser validado no servidor e só aceito se cobrir todas as NCs e todos os locais enviados.
- **FR-024**: O resumo aceito MUST ficar guardado junto do card e aparecer para todos. Quando as NCs do pacote mudam, ele MUST deixar de ser exibido até o dono gerar outro.
- **FR-025**: Se a IA falhar, estourar o limite, não estiver configurada ou devolver um resumo inválido, o card MUST usar o resumo local, sem perder dados.
- **FR-026**: Só o dono MUST poder excluir um pacote de vez, e a exclusão MUST ficar no histórico.

**Limpeza e organização**

- **FR-027**: O envio de PDF e `.zip` MUST ser removido nesta entrega, junto com o código, as dependências e os arquivos que só existiam para ele.
- **FR-028**: O repositório MUST manter só o necessário para o MVP, com a interface e o servidor em módulos separados e cada regra de negócio (leitura da planilha, situação, agrupamento, exportação, IA, acesso) num módulo próprio e testável. A estrutura exata fica no plano.
- **FR-029**: O README MUST descrever o novo fluxo, as variáveis de ambiente e o que sai do navegador.

**Qualidade**

- **FR-030**: A importação (leitura, deduplicação, situação, agrupamento) MUST ter testes de regressão com fixtures anonimizadas, cobrindo reinspeções, rodapé, sublocais vazios ou ".", itens `NÃO SE APLICA` e pacotes com FVS e fiscalização.
- **FR-031**: A interface MUST funcionar no celular e no computador, sem rolagem horizontal, e ser utilizável por teclado, com rótulos em todos os campos.

### Key Entities

- **Pacote**: identificado pelo `Código Pacote`. Tem tarefa, bloco, pavimento, equipe, prazo mais próximo, coluna do kanban, data de saída (se saiu da planilha) e o resumo da IA (se houver).
- **Item de inspeção**: identificado pelo `Identificador Vínculo Item`, pertence a um pacote. Tem a descrição e a situação da inspeção mais recente.
- **NC**: identificada pelo `Identificador Vínculo Problema`, pertence a um item. Tem tipo, descrição do problema, sublocal, origem (FVS ou fiscalização), prazo, data real de correção e situação.
- **Marcação**: acréscimo da equipe sobre uma NC ou um pacote (corrigida, comentário), com autor e data e hora. A importação nunca a sobrescreve.
- **Resumo da IA**: linhas do card geradas pela IA para um pacote, com a data e a referência das NCs que ele cobre, para saber quando ficou desatualizado.
- **Evento do histórico**: o que mudou, em qual pacote ou NC, quem fez e quando.
- **Importação**: uma carga da planilha, com data e hora, autor e quantos pacotes e NCs entraram, mudaram ou saíram.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com a planilha do dia (cerca de 6.300 linhas úteis, 73 pacotes e 1.006 NCs, como a amostra), a pessoa vê o kanban atualizado em menos de 1 minuto, num celular comum.
- **SC-002**: Em 100% dos casos de teste de regressão, cada NC aparece uma vez só e na situação certa.
- **SC-003**: Reimportar a mesma planilha 5 vezes seguidas não muda nenhum card nem apaga nenhuma marcação.
- **SC-004**: O arquivo da planilha nunca chega ao servidor, o que dá para conferir inspecionando o que o site envia durante a importação.
- **SC-005**: Nenhuma ação feita com a credencial da equipe aciona a IA ou exclui dados.
- **SC-006**: Em 100% dos resumos da IA aceitos, todas as NCs e todos os locais do pacote estão representados.
- **SC-007**: Com resumo da IA, os cards da amostra ficam com menos linhas que o resumo local, em média.
- **SC-008**: Depois da limpeza, não sobra no repositório nenhum arquivo, dependência ou código que só servia ao fluxo de PDF.

## Assumptions

- A planilha é a exportação padrão do sistema de inspeção, sempre com a mesma aba e as mesmas 29 colunas.
- A ordem das reinspeções é dada pela `Data Inspeção` (com horário) e, no empate, pelo `Identificador Histórico Item`.
- Um único card por pacote basta, porque cada pacote tem uma tarefa só (confirmado na amostra).
- Uma obra por instalação do site. Várias obras ficam fora do MVP.
- A equipe é pequena (até uns 20 usuários), com poucas pessoas ao mesmo tempo.
- Os dados ficam num banco Postgres gerenciado, ligado ao Vercel (decisão do dono; detalhes no plano).
- A IA continua sendo um serviço externo compatível com o atual; o plano decide se mantém o provedor.
- O agrupamento por item, o cartão atual e a exportação de texto e CSV são aproveitados e adaptados.
- Notificações, relatórios de prazo vencido, painéis de indicadores e login individual ficam fora do MVP.

## Dependências

Emenda MINOR 1.0.0 → 1.1.0 da constituição, **aplicada em 2026-11-23**:

1. **Princípio IV, Entrada**: o rodapé tem texto em `Código Pacote`. A regra passa a ser "ignorar linhas cujo `Código Pacote` não seja numérico", e o cabeçalho é procurado em vez de ficar numa linha fixa.
2. **Princípio V, Situação da NC**: Concluída passa a ser "inspeção mais recente do item diferente de `REPROVADA`", o que inclui `NÃO SE APLICA`.
3. **Princípio V, armazenamento**: o servidor passa a poder guardar também (d) o resumo da IA de cada card, só para exibição.
4. **Restrições técnicas, PDF**: o PDF sai nesta entrega, em vez de "está em descontinuação".
5. **Restrições técnicas, Acesso**: a equipe usa uma senha compartilhada e o nome informado, que não é conferido, vai para o histórico.
