# Sistema de Diagnóstico de Crescimento

App local (Node.js) que conduz uma auditoria ampla do negócio com IA de verdade —
a Ana percorre vendas, marketing/SEO, operações, financeiro, equipe e atendimento,
aprofunda na dor principal e nas consequências de não agir, e ao final monta uma
**apresentação .pptx** pronta: diagnóstico, matriz de oportunidades (esforço × impacto),
plano de 5 dias e uma oferta de implementação em três níveis (DIY/DWY/DFY) com
garantia condicional.

## Como configurar (uma vez só)

1. Abra um terminal nesta pasta (`audit/ia-app`).
2. Instale as dependências:
   ```
   npm install
   ```
3. Copie `.env.example` para `.env` e cole sua chave da API da Anthropic
   (gerada em https://console.anthropic.com/settings/keys):
   ```
   cp .env.example .env
   ```
   Depois edite o `.env` e troque `sua-chave-aqui` pela chave de verdade.
   **A chave fica só no seu computador — nunca é enviada para mim nem para
   ninguém além da própria API da Anthropic.**

## Como usar

```
npm start
```

O servidor reinicia sozinho sempre que `server.js` ou `pptx-builder.js` mudam
(usa `nodemon` por baixo dos panos) — não precisa parar e rodar `npm start`
de novo a cada ajuste. Se quiser rodar sem isso (um único processo, sem
auto-restart), use `npm run start:once`.

Abra http://localhost:3000 no navegador. Informe a empresa, o custo médio da
hora da equipe e (opcional) o site da empresa, clique em "Iniciar diagnóstico"
e responda as perguntas da Ana normalmente — ela audita os principais setores
do negócio, não só um problema isolado, e se aprofunda na dor principal até
chegar em algo mensurável. Quando a entrevista terminar (ou clicando em "Gerar
apresentação agora"), clique em "Gerar apresentação (.pptx)" para baixar os
slides — com ferramentas e benchmarks pesquisados na web quando fizer sentido.

Dá pra baixar tanto a transcrição (`.md`) quanto a apresentação (`.pptx`).

## Custo

Cada entrevista + apresentação consome tokens da API da Anthropic (cobrados na
sua conta, não aqui). A apresentação usa busca na web (algumas consultas) e
uma resposta longa em JSON estruturado, então custa mais que uma chamada
simples de texto — ainda assim, a casa de alguns centavos de dólar por
diagnóstico completo.

## Estrutura

```
ia-app/
├── server.js          # Backend Express — chama a API da Anthropic
├── pptx-builder.js     # Monta o .pptx a partir do JSON estruturado do relatório
├── package.json
├── .env                # Sua chave (não versionar / não compartilhar)
├── .env.example
└── public/
    ├── index.html      # Landing page + chat da entrevista
    ├── app.js
    └── styles.css
```
