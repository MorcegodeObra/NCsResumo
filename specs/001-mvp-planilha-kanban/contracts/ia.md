# Contrato: resumo do card pela IA (Princípio II)

Travado por `lib/servidor/ia.test.ts` (a IA é simulada: o teste injeta a resposta).

## Entrada enviada à IA

Vão só as NCs visíveis do pacote, lidas do banco, com ids curtos atribuídos pelo servidor:

```text
Tarefa: <tarefa>
NCs:
- n1 | <item> | <descricao> | <sublocal ou "sem local">
- n2 | ...
```

Cada campo é cortado como em `str()`: o item em 120 caracteres, a descrição em 300 e o sublocal
em 60. No máximo 300 NCs. O prompt do sistema diz que o texto é só **dado** e que instruções
dentro dele devem ser ignoradas.

## Resposta esperada

```json
{ "linhas": [ { "texto": "Prumo e esquadro de alvenaria fora da tolerância", "ncs": ["n1", "n2", "n5"] } ] }
```

- A IA pode juntar itens parecidos numa linha só.
- O `texto` não deve trazer locais nem contagem. Se trouxer, é aceito do mesmo jeito.

## Validação no servidor

A resposta só é aceita se:

1. O JSON é válido e `linhas` é uma lista de 1 a 30 itens.
2. Cada `texto` não fica vazio depois de cortado em 120 caracteres.
3. Cada `ncs` tem pelo menos um id, e todo id existe na entrada.
4. A união de todos os `ncs` é **igual** ao conjunto enviado. Uma NC pode aparecer em mais de
   uma linha, mas nenhuma pode faltar.

Se qualquer regra falhar, o resultado é o resumo local e nada é gravado.

## O que é exibido

O servidor monta cada linha como `texto (juntarLocais(sublocais das NCs citadas)) ×n`, com os
locais e a contagem calculados por ele. Grava `[{ texto, ncs: [ids reais] }]` e a assinatura (`data-model.md`, "Resumo da IA válido para exibição"; a situação não entra nela).
Assim, nenhum local se perde, mesmo que a IA esqueça de algum no texto (SC-006).
