# Contrato: rotas da API

Todas as rotas respondem JSON. Erros vêm como `{ "erro": string }`, com o status HTTP:

- 400: entrada inválida;
- 401: sem sessão;
- 403: papel insuficiente;
- 404: não encontrado;
- 413: corpo grande demais;
- 500: erro interno.

Toda entrada é validada e cortada no tamanho máximo do `data-model.md`. Toda rota, menos
`POST /api/sessao`, exige o cookie `sessao`.

`autor` é o nome informado pela pessoa: 1 a 60 caracteres, obrigatório em toda mudança feita
pela equipe. Nas ações do dono, o autor gravado é sempre `dono`.

## Sessão

### `POST /api/sessao`
- Corpo: `{ "senha": string }`.
- 200 `{ "papel": "equipe" | "dono" }` e grava o cookie `sessao` (HttpOnly, Secure, SameSite=Lax,
  12 h).
- 401 se a senha não for nenhuma das duas.

### `DELETE /api/sessao`
- 200 e apaga o cookie.

### `GET /api/sessao`
- 200 `{ "papel": "equipe" | "dono" }` ou 401. A interface usa para saber o que mostrar.

## Importação (equipe)

### `POST /api/importacoes`
- Limite: 3 MB, até 500 pacotes e 10.000 NCs. Acima disso, 413.
- Corpo:
```json
{
  "autor": "Maria",
  "pacotes": [
    { "codigo": "143980", "tarefa": "…", "bloco": "Bloco 12", "pavimento": "…", "equipes": "7838-WL" }
  ],
  "ncs": [
    {
      "id": "12520", "codigoPacote": "143980", "idItem": "7311471", "item": "…",
      "origem": "fvs", "tipo": "…", "descricao": "…", "sublocal": "AP 01",
      "prazo": "2026-10-24", "dataCorrecao": null,
      "situacaoItem": "REPROVADA", "ultimaInspecao": "2026-10-23T11:01:29"
    }
  ]
}
```
- Validação: toda NC aponta para um pacote do mesmo corpo, os ids não se repetem e `origem` é
  um valor da lista.
- A gravação é tudo ou nada.
- 200 `{ "contagens": { "pacotes", "novos", "saidos", "voltaram", "ncs", "ncsNovas", "ncsMudaram" } }`.

## Kanban (equipe)

### `GET /api/pacotes`
- 200 `{ "pacotes": PacoteVisao[] }`. Inclui os pacotes em Concluído e não inclui os excluídos.

```ts
PacoteVisao = {
  codigo, tarefa, bloco, pavimento, equipes,
  coluna: "aberto" | "corrigido" | "concluido",
  origem: "fvs" | "fiscalizacao",   // origem das NCs visíveis
  prazo: string | null,              // menor prazo das NCs visíveis
  saiuEm: string | null,
  linhas: { texto: string, ncs: string[] }[],   // resumo da IA válido ou resumo local
  resumoIA: boolean,
  ncs: { id, item, tipo, descricao, sublocal, prazo, situacao: "aberta" | "corrigida",
         marcadaPor: string | null }[],         // só as NCs visíveis
  comentarios: { autor, texto, em }[]
}
```

### `GET /api/pacotes/:codigo/historico`
- 200 `{ "eventos": { tipo, idNc, detalhe, autor, em }[] }`, do mais novo para o mais antigo,
  no máximo 200.

### `POST /api/pacotes/:codigo/marcacoes`
- Corpo `{ "autor": string, "ncs": string[] }` para marcar NCs como corrigidas. Mover o pacote
  para Corrigido é enviar todas as NCs abertas visíveis.
- 200 `{ "pacote": PacoteVisao }`. NC que já está marcada é ignorada, sem evento.

### `DELETE /api/pacotes/:codigo/marcacoes`
- Corpo `{ "autor": string, "ncs": string[] }` para desmarcar.
- 200 `{ "pacote": PacoteVisao }`.

### `POST /api/pacotes/:codigo/comentarios`
- Corpo `{ "autor": string, "texto": string }` (1 a 1000).
- 200 `{ "pacote": PacoteVisao }`.

## Dono

### `POST /api/pacotes/:codigo/resumo`
- Exige o papel `dono`; com a sessão da equipe, 403.
- Sem corpo: o servidor lê as NCs do banco.
- 200 `{ "pacote": PacoteVisao }`.
- Se a IA falhar ou devolver uma resposta inválida, também 200, com `resumoIA: false` e o
  aviso `"aviso": string`. Nada é gravado nesse caso (FR-025). O contrato da IA está em `ia.md`.

### `DELETE /api/pacotes/:codigo`
- Exige o papel `dono`.
- Apaga o pacote, as NCs, as marcações e os comentários dele, e grava o evento
  `pacote_excluido` com o resumo do que foi apagado.
- 200 `{ "ok": true }`.
