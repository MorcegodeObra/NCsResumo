# Contratos 005

Todas as rotas novas aceitam só o **dono**: 401 sem sessão e 403 com a sessão da equipe. Quando dão certo,
respondem 200 `{ pacote: PacoteVisao }`. Respondem 404 se o pacote (ou a NC) não existe ou se a NC é de outro pacote.

| Rota | Efeito | 409 quando |
|---|---|---|
| `POST /api/pacotes/:codigo/arquivo` | arquiva o card | já está arquivado |
| `DELETE /api/pacotes/:codigo/arquivo` | desarquiva o card e as NCs dele | não está arquivado |
| `POST /api/pacotes/:codigo/ncs/:id/arquivo` | arquiva a NC | a NC não está visível |
| `DELETE /api/pacotes/:codigo/ncs/:id/arquivo` | desarquiva a NC | a NC não está arquivada |
| `PUT /api/pacotes/:codigo/urgencia` corpo `{ "urgente": boolean }` | marca ou desmarca | o card está arquivado ou em Concluído |

O `:id` é validado como o `codigoDaRota` já faz, com o formato do identificador da NC; fora do formato, responde 404.
Um corpo de urgência sem `urgente` booleano responde 400.

## Mudanças em rotas existentes

- `GET /api/pacotes`: a equipe deixa de receber os cards com `arquivadoEm`. O dono continua recebendo todos.
- A ficha (`/cards/:codigo`) lê da mesma lista; para a equipe, card arquivado aparece como "não encontrado".

## `PacoteVisao` (campos novos)

```ts
arquivadoEm: string | null; // ISO; veja data-model.md, regra 3
urgente: boolean;
recenteEm: string | null;   // ISO; ordena "os mais recentes"
arquivadas: NCVisao[];      // NCs arquivadas uma a uma, cada uma com arquivadaEm
```

`NCVisao` ganha `arquivadaEm: string | null`. Nas NCs visíveis ele é sempre `null`.
