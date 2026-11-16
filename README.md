# Resumo de NCs

Site para resumir as não conformidades (NCs) das fichas de obra.

1. A pessoa envia os PDFs das fichas (ou um `.zip` com todos).
2. O site separa **FVS** (qualidade) de **fiscalização**. A regra é o cabeçalho do PDF: `SERVIÇO: FISCALIZAÇÃO ...` ou `SERVIÇO: FVS ...`.
3. Lê as páginas "Registro de não conformidade" de cada ficha.
4. Mostra o **resumo por documento** (aba "Por documento") e o **resumo geral** (aba "Resumo geral"), em cartões, um por serviço, separados em FVS e Fiscalização.

Cada cartão segue o modelo do quadro físico: `ORIGEM` e `EMPRESA` no topo, local no título (ex.: "Bloco 3 · 3° PAV."), resumo curto e rodapé com prazo, responsável e reconferida.

Botões do resumo geral: **Copiar texto** (para WhatsApp), **Baixar CSV** (colunas B a K da aba NCs da planilha de controle; cole a partir de B2) e **Imprimir**. A opção "Se o serviço tem fiscalização, ignorar a FVS dele" aplica a regra de tratar só a fiscalização.

## Como funciona (e o que sai do navegador)

- **Por padrão não usa IA e não precisa de chave nem de senha.** Os PDFs são lidos no navegador (pdf.js) e as NCs são extraídas direto do texto: item de inspeção, descrição do problema, prazo, responsável, bloco, pavimento, apartamento e equipe. Nada sai do navegador.
- O resumo sem IA agrupa as NCs por item de inspeção, com a descrição mais comum e os locais (ex.: "AP 1-2-3"). Quando a ficha não traz o apartamento, mostra a contagem (ex.: "Prumo de paredes ×8"). Mostra no máximo 3 linhas, e a terceira junta o resto ("Outros: ...").
- **IA é opcional e só escreve o resumo.** A leitura das fichas é sempre local. Marcando "Melhorar o resumo com IA", a lista de NCs de cada cartão (item, descrição e apartamento) vai ao servidor do site, que chama uma API compatível com OpenAI (Groq por padrão, plano gratuito) para escrever o resumo em 3 linhas. Se a IA falhar ou estourar o limite, o cartão usa o resumo sem IA.
- Fichas sem página de NC aparecem como "sem NC".

## Rodar no seu computador

```bash
npm install
npm run dev                  # http://localhost:3000
# Só para a IA opcional: cp .env.example .env.local e preencha LLM_API_KEY (chave do Groq)
```

## Publicar (GitHub + Vercel)

1. Crie um repositório no GitHub e envie esta pasta (`git init`, `git add .`, `git commit`, `git push`). O `.gitignore` já deixa `.env` de fora. **Nunca suba a chave da API.**
2. No Vercel: **Add New → Project**, escolha o repositório. Não precisa mudar nada (Next.js é detectado sozinho).
3. Só se for usar a IA opcional: em **Settings → Environment Variables**, cadastre:
   - `LLM_API_KEY`: sua chave do Groq (console.groq.com).
   - `SITE_PASSWORD`: uma senha para quem for usar. **Defina sempre que o link for público**: sem ela, qualquer pessoa com o link gasta a sua chave da API.
   - `LLM_BASE_URL` e `LLM_MODEL` (opcionais): os padrões são o Groq e o modelo `openai/gpt-oss-120b`. Para usar Gemini, OpenAI ou OpenRouter, troque a URL, a chave e o modelo.
4. Faça o deploy. Quem acessar digita a senha no campo da página.

## Limites conhecidos

- Só funciona com PDFs que têm **texto** (como os exportados do sistema de fichas). PDF escaneado (imagem) precisa de OCR, que não está incluído.
- Sem IA o processamento é rápido e gratuito. Com IA, há uma chamada por cartão do resumo geral, feitas uma de cada vez por causa do limite por minuto do plano gratuito.
- (Só com IA) A senha é única e compartilhada. Para controle por pessoa, o próximo passo seria colocar login (por exemplo, Auth.js ou Clerk).
- Sem limite de uso por pessoa. Se for abrir para muita gente, vale colocar um limite de requisições.
- O sublocal (apartamento) só aparece quando está no PDF; nas fichas de fiscalização com sublocal em branco, o site tenta achar pelo nome do arquivo e deixa vazio se não achar. Nesse caso as NCs de vários apartamentos entram no mesmo cartão, sem a localização de cada uma.

## Estrutura

```
app/page.tsx            interface (envio, abas, cartões)
app/api/resumir         resumo de um cartão (IA opcional)
lib/extrairLocal.ts     leitura das NCs direto do texto do PDF
lib/classify.ts         FVS x fiscalização e páginas de NC
lib/agrupar.ts          um cartão por serviço, prazo, responsável
lib/exportar.ts         texto e CSV
components/CartaoNC.tsx cartão no formato do quadro
```
