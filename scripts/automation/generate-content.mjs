import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const inputPath = path.join(root, 'automation/output/candidates.json');
const outputDir = path.join(root, 'automation/output');
const outputPath = path.join(outputDir, 'content-package.json');

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_AI_TOKEN;
const model = process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

if (!accountId || !apiToken) {
  throw new Error('CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_AI_TOKEN são obrigatórios.');
}

const raw = await fs.readFile(inputPath, 'utf8');
const selection = JSON.parse(raw);

if (!Array.isArray(selection.candidates) || selection.candidates.length === 0) {
  throw new Error('Nenhum candidato encontrado em candidates.json.');
}

const systemPrompt = `Você é o agente de conteúdo do projeto Achados do Ethan, um perfil brasileiro de curadoria de ofertas com links de afiliado do Mercado Livre.

Objetivo: escolher o produto com maior potencial de atenção, compartilhamento e clique entre os candidatos fornecidos e criar conteúdo orgânico para Instagram.

Regras obrigatórias:
- escreva em português do Brasil;
- não invente preço, desconto, avaliação, estoque, frete, cupom ou característica não fornecida;
- trate preço e desconto como dados de referência que podem mudar e incentive a conferência no link;
- não prometa resultado do produto;
- deixe claro quando houver link de afiliado/publicidade;
- Reel com 15 a 20 segundos, abertura forte nos 3 primeiros segundos e texto curto na tela;
- não crie textos que cubram o produto em uma edição visual;
- CTA principal: conferir a oferta na vitrine/link e seguir @achadosdoethan;
- Stories: exatamente 3 telas;
- hashtags: entre 5 e 9, específicas e sem spam;
- não use linguagem enganosa como 'corre que vai acabar' sem evidência.

Retorne SOMENTE JSON válido, sem markdown, com esta estrutura:
{
  "selectedProductId": "string",
  "selectionReason": "string curta",
  "reel": {
    "hook": "string",
    "durationSeconds": 18,
    "scenes": [
      {"from": 0, "to": 3, "visual": "string", "text": "string", "voiceover": "string"}
    ],
    "endCta": "string"
  },
  "caption": "string",
  "hashtags": ["#tag"],
  "stories": [
    {"frame": 1, "headline": "string", "support": "string", "cta": "string"},
    {"frame": 2, "headline": "string", "support": "string", "cta": "string"},
    {"frame": 3, "headline": "string", "support": "string", "cta": "string"}
  ],
  "disclosure": "Publicidade / link de afiliado. Preço e disponibilidade podem mudar."
}`;

const userPrompt = `Escolha 1 produto e crie o pacote de conteúdo usando somente estes dados:\n${JSON.stringify(selection.candidates, null, 2)}`;

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1800,
    temperature: 0.45,
  }),
});

const payload = await response.json();

if (!response.ok || !payload?.success) {
  const errors = payload?.errors ? JSON.stringify(payload.errors) : `HTTP ${response.status}`;
  throw new Error(`Workers AI falhou: ${errors}`);
}

const text = payload?.result?.response;
if (!text) {
  throw new Error('Workers AI não retornou texto.');
}

let content;
try {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  content = JSON.parse(cleaned);
} catch (error) {
  throw new Error(`Resposta da IA não é JSON válido: ${error.message}`);
}

const selected = selection.candidates.find((item) => item.id === content.selectedProductId);
if (!selected) {
  throw new Error(`A IA selecionou um produto desconhecido: ${content.selectedProductId}`);
}

const result = {
  generatedAt: new Date().toISOString(),
  model,
  selectedProduct: selected,
  content,
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

console.log(`Conteúdo criado para: ${selected.title}`);
console.log(`Arquivo criado: ${path.relative(root, outputPath)}`);
