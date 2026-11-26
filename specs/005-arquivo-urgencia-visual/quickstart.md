# Validação 005

Antes de começar: Postgres local migrado (`npm run db:migrar`) e uma planilha real importada. Rode os testes e o
build separados, por causa da memória.

```bash
npm test          # rotas novas, visão, Kanban, Ficha, Arquivo, Moldura
npx tsc --noEmit
npm run build
npm run dev
```

## Cenários (logado como dono, depois como equipe)

1. **Arquivo do card**: na ficha, clique em **Arquivar card**. O card sai do kanban, de `/cards` e de `/tabela` e
   aparece em `/arquivo`. Como equipe, `/arquivo` não aparece no menu, e a ficha desse card responde "não encontrado".
2. **NC nova traz o card de volta**: tire uma NC da planilha, arquive o card e importe a planilha completa. O card
   volta para o kanban, e o histórico mostra "desarquivado" com o autor "importação".
3. **NC arquivada**: arquive uma NC do card. Ela sai da ficha, e o card pode mudar de coluna. Reimporte: ela continua
   arquivada. Arquive todas as NCs visíveis: o card vai para `/arquivo`.
4. **Urgência**: o dono marca o card como urgente. O card ganha o selo e vai para o topo da coluna, para os dois
   papéis. Como equipe, não aparece botão de urgência, e chamar `PUT .../urgencia` responde 403.
5. **Kanban fixo**: com mais de 10 cards numa coluna, a página não rola, só a coluna. O contador mostra o total.
   **Ver mais** traz mais 10. A busca acha um card que estava escondido pelo corte.
6. **Celular (360 px, nas ferramentas do navegador)**: sem rolagem para o lado. Abas Aberto/Corrigido. A barra de
   baixo leva a todas as páginas e ao Sair.
7. **PC**: o menu lateral abre e recolhe pelo botão e pelo teclado (Tab e Enter), e a escolha fica salva ao recarregar.
8. **Impressão** (`/cards`, Ctrl+P): os cards arquivados não aparecem, e a barra e o menu também não.

Antes do deploy: migrar o Neon (PENDENCIAS, item 2).
