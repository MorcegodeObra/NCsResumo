# NCsResumo Constitution

## Core Principles

### I. Leitura Local dos Arquivos

- O arquivo de entrada (a planilha `.xlsx` de inspeções) MUST ser lido no navegador.
- O arquivo em si MUST NOT ser enviado ao servidor nem armazenado nele, em nenhuma hipótese.
  Só saem do navegador os campos estruturados que o Princípio V autoriza.
- Todo dado que sai do navegador (para o servidor do site ou para a IA) MUST ser restrito aos
  campos necessários para a feature, e o `plan.md` dela MUST listar esses campos e justificar
  cada um.

**Razão**: a planilha tem nomes de inspetores, colaboradores e CNPJs. Ler no
navegador e mandar só o necessário reduz a exposição desses dados.

### II. IA Exclusiva do Dono

- Funcionalidades com IA (extração, resumo, reescrita) MUST estar disponíveis somente para o
  dono do projeto, autenticado com credencial própria. A credencial MUST ser verificada no
  servidor, em toda rota que chama a IA.
- O restante da equipe MUST usar apenas o processamento local. Nenhuma ação da equipe pode
  disparar uma chamada à IA.
- Quando a IA falha, estoura o limite ou não está configurada, o site MUST cair no resultado
  local (agrupamento determinístico) sem perder dados.
- O texto enviado à IA MUST ser tratado como dado no prompt (não como instrução), e a resposta
  MUST ser validada e truncada no servidor antes de ser usada.
- A IA resume dentro do card do pacote: pode fundir itens de inspeção parecidos numa linha, mas
  o resumo MUST cobrir todas as NCs não concluídas e todos os locais enviados. O servidor MUST
  recusar o resumo que omitir alguma, e o card fica com o resumo local.

**Razão**: a chave da API é paga ou limitada e pertence ao dono. Restringir o uso evita custo
e vazamento, e o resultado local garante que a equipe nunca fique sem resultado.

### III. Test-First (NÃO NEGOCIÁVEL)

- TDD é obrigatório em todo o código: `lib/`, rotas de API e interface (`app/`, `components/`).
  O ciclo MUST ser: escrever o teste → confirmar que ele falha → implementar → refatorar.
- A ferramenta de teste é o **Vitest**. Componentes React são testados com Vitest em ambiente
  de DOM.
- Toda correção de bug MUST começar por um teste que reproduz o bug.
- Fixtures MUST ser **anonimizadas** (CNPJ, nomes de empresas, de inspetores e de
  colaboradores trocados por fictícios). A planilha real e PDFs reais MUST NOT ser commitados.
- A importação da planilha (leitura, deduplicação, situação da NC, agrupamento do card) MUST
  ter testes de regressão que cubram as linhas repetidas por reinspeção, o rodapé, os
  sublocais vazios ou ".", os itens `NÃO SE APLICA` e os pacotes com FVS e fiscalização.

**Razão**: a lógica central é derivar estado de uma planilha com linhas repetidas e
inconsistentes, e um erro aí abre ou fecha NCs erradas sem que ninguém perceba.

### IV. Contratos de Formato Fixos

São contratos que só mudam junto com o sistema de origem, o quadro ou a planilha de controle:

- **Entrada**: a aba "Base de Dados de Inspeções", exportada pelo sistema de inspeção, com as
  29 colunas pelo nome do cabeçalho (de `Nº Inspeção` a `Colaborador NC`).
  - A linha do cabeçalho MUST ser procurada (na exportação atual é a linha 2), não assumida.
  - Linhas vazias e linhas cujo `Código Pacote` não seja numérico MUST ser ignoradas. O rodapé
    traz "MENTOR CONSTRUÇÃO / PLANEJE TECNOLOGIA" na própria coluna `Código Pacote`.
  - Se faltar coluna no cabeçalho, a importação MUST ser recusada inteira, com uma mensagem
    dizendo qual coluna falta.
- **Identidade**:
  - Pacote = `Código Pacote`.
  - NC = `Identificador Vínculo Problema`. A mesma NC aparece em várias linhas, uma por
    reinspeção do item, e MUST virar um único registro. Reimportar MUST atualizar, nunca
    duplicar.
- **Origem**:
  - FVS × fiscalização é decidido por `Descrição FVS`: contém `FISCALIZAÇÃO` ou contém `FVS`.
  - Quando o pacote tem NCs de fiscalização, o card MUST mostrar só as de fiscalização. Sem
    fiscalização, mostra as de FVS.
- **Card**:
  - Há um card por pacote, com tarefa, bloco (`Etapa`), pavimento (`Local`), equipe, prazo
    mais próximo e situação.
  - Os problemas MUST aparecer agrupados por item de inspeção, com os locais (`Sublocal`) e a
    contagem, ex.: "Esquadro entre alvenarias (AP 1-2-3, HALL A) ×19". Cada grupo pode ser
    expandido para mostrar a lista de NCs.
- **CSV**: colunas B a K da aba NCs da planilha de controle, colando a partir de B2.

Mudar qualquer contrato MUST ter spec própria e teste de contrato que trave o novo formato.

**Razão**: a planilha é gerada por um sistema externo que o projeto não controla. Validar
o formato evita importar lixo em silêncio, e um card estável evita confundir a equipe de campo.

### V. Planilha Diária como Fonte da Inspeção

- A planilha é importada todos os dias e é a **fonte da verdade da inspeção** (dados da NC,
  situação dos itens e datas). Cada importação MUST atualizar esses dados.
- O servidor guarda apenas:
  - (a) os campos estruturados da NC e do pacote vindos da planilha;
  - (b) o que a equipe acrescenta no kanban (marcação, comentário, quem e quando);
  - (c) o histórico de mudanças.
  - (d) o resumo da IA de cada card, só para exibição, com a referência das NCs que ele cobre.
    Quando as NCs do pacote mudam, o resumo MUST deixar de ser exibido até ser gerado de novo.
  A importação MUST NOT apagar nem sobrescrever o que a equipe acrescentou (b). Qualquer
  outro armazenamento exige emenda desta constituição.
- **Situação da NC**:
  - A situação do item é a da inspeção mais recente (maior `Data Inspeção`), contando também
    as linhas do item sem NC.
  - **Concluída**: quando a inspeção mais recente do item não é `REPROVADA` (inclui
    `APROVADA`, `APROVADO APÓS INSPECAO` e `NÃO SE APLICA`). A NC sai do card e fica no
    histórico.
  - **Corrigida**: quando o item continua `REPROVADA`, mas há `Data Real Correção` ou marcação
    da equipe.
  - **Aberta**: nos demais casos.
- **Kanban do pacote**, com as colunas Aberto → Corrigido → Concluído:
  - O pacote fica na coluna da NC menos avançada.
  - Um pacote que estava no servidor e não veio na importação do dia MUST ir para Concluído,
    com a data em que saiu, porque a planilha só traz pacotes reprovados.
- Qualquer pessoa da equipe com acesso PODE marcar NCs e mover pacotes para Corrigido. Toda
  mudança, da equipe ou da importação, MUST registrar quem fez (ou "importação") e quando.
- Nada é apagado sem rastro: exclusão definitiva só por ação explícita do dono, e o histórico
  MUST ser preservado.

**Razão**: o sistema de inspeção é quem aprova, e o kanban serve para a equipe acompanhar e
agir. Separar o que vem da planilha do que a equipe registra deixa a importação diária
repetível sem perder o trabalho da equipe.

## Restrições Técnicas e de Segurança

- **Stack**: Next.js (App Router), React e TypeScript, com deploy no Vercel. Dependências novas
  são livres. O `plan.md` registra as que forem adicionadas.
- **PDF**: o upload de PDF e `.zip` foi substituído pela planilha e MUST ser removido junto com
  o código e as dependências que só serviam a ele. Voltar a aceitar PDF exige emenda.
- **Acesso**: dois níveis, ambos verificados no servidor: o **dono** (libera a IA e a exclusão
  definitiva) e a **equipe** (importação, kanban e processamento local). Nenhuma rota que lê
  ou grava dados persistidos pode ficar aberta sem autenticação.
  - A equipe entra com uma senha compartilhada e informa o nome antes da primeira mudança.
    Esse nome vai para o histórico e não é conferido. Login individual exige emenda.
  - O dono entra com credencial própria, diferente da senha da equipe.
- **Segredos**: chaves e senhas ficam só em variáveis de ambiente (`.env.local` localmente e
  Environment Variables no Vercel). `.env*` MUST NOT ser commitado.
- **Entrada não confiável**: todo dado recebido pelas rotas de API MUST ser validado e limitado
  em tamanho, como `str()` em `lib/llm.ts` já faz. Os valores da planilha são texto livre
  digitado em campo e MUST ser normalizados (espaços, "." como vazio, datas `dd/mm/aaaa`).
- **Dispositivos**: a interface MUST funcionar no celular e no computador (layout responsivo,
  sem rolagem horizontal) e MUST ser utilizável por teclado, com rótulos em todos os campos.
- **Idioma**: português do Brasil em tudo: identificadores, comentários, interface, mensagens
  de erro, prompts, specs, README e commits.
- **Repositório**: privado, de uso interno da equipe de obra.

## Fluxo de Desenvolvimento

- Toda feature nova passa por `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` antes do
  código. A seção "Constitution Check" do plano MUST verificar os princípios I a V.
- Correções pequenas de bug podem ir direto, sem spec, mas sempre com o teste que reproduz o
  bug (Princípio III).
- Desenvolvedor único, com commits direto na `main`. Antes de todo push, MUST passar:
  `vitest run`, `tsc --noEmit` e `next build`.
- O README MUST ser atualizado na mesma mudança sempre que mudar o comportamento visível, as
  variáveis de ambiente ou o que sai do navegador.

## Governance

- Esta constituição prevalece sobre qualquer outra prática do repositório. Specs, planos e
  tarefas que a contrariem MUST ser corrigidos, ou a constituição emendada primeiro.
- **Emendas**: só o dono do projeto aprova. Cada emenda é feita por `/speckit-constitution`,
  registra o motivo no Sync Impact Report e atualiza a versão e a data.
- **Versionamento** (SemVer):
  - MAJOR: remove ou redefine um princípio de forma incompatível.
  - MINOR: adiciona um princípio ou seção, ou amplia materialmente uma regra.
  - PATCH: esclarecimentos e correções de texto.
- **Conformidade**: todo `plan.md` passa pelo Constitution Check. Exceções MUST ser
  justificadas na tabela "Complexity Tracking" do plano, e `/speckit-analyze` é usado antes
  de implementar features que tocam os princípios I, II ou V.

**Version**: 1.1.0 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
