# Resumo de NCs

Site para acompanhar as não conformidades (NCs) da obra a partir da planilha diária de inspeções.

A especificação está em `specs/001-mvp-planilha-kanban/`, `specs/002-paginas-resolucao-descricao/`,
`specs/003-kanban-enxuto-edicao-impressao/`, `specs/004-ficha-conclusao-quadro/`, `specs/005-arquivo-urgencia-visual/` e `specs/006-recorrentes-projetos/`.

## Páginas

- **Kanban** (`/`): quadro que cabe na tela, com o local e o serviço de cada card; clicar abre a ficha, e arrastar ou o botão move. Cada coluna mostra os 10 cards mais recentes, com os urgentes no topo, e **Ver mais** traz mais 10; a busca procura em todos. No celular, uma coluna por vez, em abas. Só o dono vê Concluído.
  As colunas **Recorrentes** e **Projetos** guardam os cards com essa categoria; arrastar para lá dá a categoria, e arrastar de volta para a coluna da situação tira.
- **Cards** (`/cards`): cards de Aberto e Corrigido em tamanho fixo, com a possível resolução (até 3 linhas na tela), selo de categoria, busca, exportação e **Resumir todos**. A busca aceita vários termos em qualquer ordem (ex.: "alvenaria bloco 1").
- **Ficha** (`/cards/<código>`): tudo de um pacote numa página: NCs, marcação, edição, possível resolução, histórico, impressão, IA, conclusão e exclusão.
- **Tabela** (`/tabela`, só o dono): abertos, corrigidos e concluídos.
- **Arquivo** (`/arquivo`, só o dono): cards e NCs que não vão ser resolvidos, com **Desarquivar**.
- **Importar** (`/importar`): passo a passo e resultado da importação.

O menu fica na lateral no computador (o botão do topo recolhe e a escolha fica salva) e numa barra embaixo no celular.
Ele mostra o nome, o papel e o botão **Sair**, que apaga a sessão e o nome guardado no aparelho.

## Importar a planilha

1. Exporte do sistema de inspeção a planilha **"Base de Dados de Inspeções"** (`.xlsx`).
2. No site, entre com a senha, abra **Importar** e escolha o arquivo em **Planilha de inspeções (.xlsx)**.
3. Aparece um card por pacote. A NC bem descrita (a descrição diz mais que o item) tem linha própria,
   com a descrição dela; as demais ficam agrupadas por item de inspeção, os locais e a
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

O dono também pode **Mover para Concluído** um pacote em Corrigido, e desfazer. A conclusão cai sozinha
quando aparece NC nova ou alguma NC volta a ficar aberta. A equipe não recebe os pacotes concluídos.

Só o dono **arquiva** (na ficha) o que não vai ser resolvido: o card inteiro ou NC por NC. O card arquivado sai do
kanban, de `/cards`, da tabela, da exportação e da impressão, e volta sozinho se a planilha trouxer NC nova. A NC
arquivada sai do card e fica arquivada até o dono desfazer; card com todas as NCs arquivadas vai para o Arquivo. O
dono também marca um card como **urgente**: o selo aparece para todos e o card sobe para o topo da coluna.

A equipe e o dono dão ao card a categoria **Recorrente** (problema que se repete) ou **Projeto** (problema dos
projetistas), na ficha ou arrastando no kanban. A categoria não muda a situação das NCs, fica no histórico com o nome,
e sai quando o dono conclui o card. A busca acha por "recorrente" e "projeto".

Em cada ficha, a equipe marca as NCs corrigidas (ou usa **Mover para Corrigido**, que marca todas as
abertas) e vê o **Histórico**, sempre com o nome e o horário. O dono escreve a **possível resolução**,
que todos leem. Em **Editar**, qualquer pessoa corrige empresa, serviço, bloco, pavimento, prazo e a
descrição e o local de cada NC; vazio volta ao valor da planilha. A importação seguinte não apaga nada disso.

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
o histórico, e a possível resolução escrita pelo dono e as edições dos cards.

## Exportar

Os botões da página **Cards** usam só os pacotes de Aberto e Corrigido que estão na busca:

- **Copiar texto**: os cards em texto, para o WhatsApp.
- **Baixar CSV**: colunas B a K da aba NCs da planilha de controle, mais a possível resolução na L; cole a partir de **B2**.
- **Imprimir**: os cards na íntegra, em duas colunas, sem os botões (em **Cards**).

## Só o dono: IA, conclusão e exclusão

- **Resumir com IA** (um card) e **Resumir todos** (um por vez) juntam itens parecidos em menos linhas.
  Os locais e as contagens são calculados pelo servidor, e o resumo que deixar alguma NC de fora é
  recusado. O resumo fica gravado para todos, com o selo **IA**, e deixa de valer quando as NCs do
  card mudam. Se a IA falhar ou não estiver configurada, o card não muda e aparece um aviso.
- Quando o **dono** importa, os cards sem resumo são resumidos depois de a importação estar gravada.
  Três falhas seguidas param a fila. A importação da equipe nunca chama a IA.
- **Vai para a IA** só: o serviço do pacote e, de cada NC (até 300), um número curto, o item, a
  descrição e o local. Empresa, bloco, pavimento, prazos e nomes não vão.
- **Excluir** apaga de vez o pacote, as NCs, as marcações e a possível resolução dele. O histórico fica. Se
  o pacote ainda estiver na planilha, a próxima importação o traz de volta como novo.

## Acesso

Há dois níveis, verificados no servidor:

- **Equipe**: senha compartilhada (`SENHA_EQUIPE`). Antes da primeira mudança, a pessoa informa o
  nome, que vai para o histórico (não é conferido).
- **Dono**: senha própria (`SENHA_DONO`), que libera também a IA, a conclusão, a tabela e a exclusão definitiva.

A sessão fica num cookie assinado com `SEGREDO_SESSAO` e dura 12 horas. Se alguma dessas três
variáveis faltar, se o segredo tiver menos de 32 caracteres ou se as duas senhas forem iguais,
**ninguém entra** (o site responde "Acesso não configurado no servidor.").

## Rodar no seu computador

```bash
npm install
# crie o .env com as variáveis da tabela abaixo
node --env-file=.env back/scripts/migrar.mjs   # cria as tabelas (pode rodar de novo sem problema)
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
| `LLM_API_KEY` | Chave da IA do dono (opcional) |
| `LLM_BASE_URL` | API compatível com a da OpenAI (opcional; padrão: Groq) |
| `LLM_MODEL` | Modelo (opcional; padrão: `openai/gpt-oss-120b`) |

No Vercel, crie o banco pelo marketplace (**Storage → Neon**) e ligue ao projeto: isso cria a
`DATABASE_URL`. Rode `npm run db:migrar` com essa URL uma vez (e de novo sempre que o
`back/db/schema.sql` mudar). As outras variáveis ficam em **Settings → Environment Variables**
(Production e Preview). **Nunca
commite o `.env`.**

## Estrutura

```
app/              casca exigida pelo Next.js: só aponta as páginas para front/ e as rotas para back/
front/            interface: componentes, estilos, leitura da planilha, exportação e cliente da API
back/             servidor: rotas, banco, sessão, validação, IA, regras, db/schema.sql e migração
compartilhado/    tipos e regras que os dois lados usam, e a planilha fictícia dos testes
specs/            especificação, plano e tarefas (Spec Kit)
```
