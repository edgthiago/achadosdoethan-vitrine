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

Objetivo: escolher o produto com maior potencial de atenção, compartilhamento e clique entre os candidatos fornecidos e criar um pacote de conteúdo orgânico para Instagram com qualidade de social media profissional.

REGRAS DE VERDADE:
- escreva em português do Brasil;
- use SOMENTE fatos presentes nos dados fornecidos;
- não invente preço, desconto, avaliação, estoque, frete, cupom, material, tamanho, benefício, desempenho, conforto, durabilidade, indicação de uso ou característica;
- não transforme selo em interpretação: se houver "Mais vendido", diga apenas que há selo "Mais vendido"; não diga "escolha dos consumidores";
- não inferir uso como "treino intenso", "ideal para", "perfeito para" ou similares;
- preço e desconto são referência e podem mudar;
- não prometa resultado do produto;
- não use urgência falsa, escassez falsa ou frases como "corre que vai acabar", "últimas unidades", "não perca", "oferta imperdível", "compre agora";
- deixe claro que existe link de afiliado/publicidade.

PADRÃO DE REEL:
- duração EXATA de 18 segundos;
- EXATAMENTE 6 cenas: 0-3, 3-6, 6-9, 9-12, 12-15 e 15-18;
- os 3 primeiros segundos precisam ter um gancho específico baseado somente em preço, desconto, categoria, título ou selo real;
- cada texto na tela deve ser curto, preferencialmente até 7 palavras;
- cada cena precisa ter visual, texto e voiceover diferentes;
- não repetir a mesma frase em cenas consecutivas;
- visual deve usar apenas a imagem do produto fornecida, descrevendo enquadramento/zoom/texto; não inventar imagens adicionais;
- não sugerir texto cobrindo o produto;
- CTA final deve levar para a vitrine e pedir para seguir @achadosdoethan;
- não use "clique aqui".

PADRÃO DE LEGENDA:
- 2 a 4 frases curtas;
- mencionar preço/desconto somente se fornecidos;
- incluir CTA para conferir na vitrine;
- incluir @achadosdoethan;
- sem clichês de urgência falsa.

PADRÃO DE STORIES:
- EXATAMENTE 3 telas;
- tela 1: atenção usando título/categoria/desconto real;
- tela 2: dado objetivo de preço/desconto/selo;
- tela 3: CTA para vitrine e seguir @achadosdoethan;
- sem frases genéricas como "não perca essa oportunidade".

HASHTAGS:
- entre 6 e 8;
- específicas para produto/categoria/curadoria;
- sem erros gramaticais;
- sem hashtags genéricas de spam.

Retorne SOMENTE JSON válido, sem markdown, exatamente com esta estrutura:
{
  "selectedProductId": "string",
  "selectionReason": "string curta",
  "reel": {
    "hook": "string",
    "durationSeconds": 18,
    "scenes": [
      {"from": 0, "to": 3, "visual": "string", "text": "string", "voiceover": "string"},
      {"from": 3, "to": 6, "visual": "string", "text": "string", "voiceover": "string"},
      {"from": 6, "to": 9, "visual": "string", "text": "string", "voiceover": "string"},
      {"from": 9, "to": 12, "visual": "string", "text": "string", "voiceover": "string"},
      {"from": 12, "to": 15, "visual": "string", "text": "string", "voiceover": "string"},
      {"from": 15, "to": 18, "visual": "string", "text": "string", "voiceover": "string"}
    ],
    "endCta": "string"
  },
  "caption": "string",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"],
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
    max_tokens: 2200,
    temperature: 0.3,
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

const expectedScenes = [[0,3],[3,6],[6,9],[9,12],[12,15],[15,18]];
if (content?.reel?.durationSeconds !== 18 || !Array.isArray(content?.reel?.scenes) || content.reel.scenes.length !== 6) {
  throw new Error('Pacote inválido: o Reel precisa ter 18 segundos e exatamente 6 cenas.');
}
for (let i = 0; i < expectedScenes.length; i += 1) {
  const scene = content.reel.scenes[i];
  const [from, to] = expectedScenes[i];
  if (scene?.from !== from || scene?.to !== to || !scene?.visual || !scene?.text || !scene?.voiceover) {
    throw new Error(`Pacote inválido: cena ${i + 1} fora do padrão ${from}-${to}s.`);
  }
}
if (!Array.isArray(content.hashtags) || content.hashtags.length < 6 || content.hashtags.length > 8) {
  throw new Error('Pacote inválido: use entre 6 e 8 hashtags.');
}
if (!Array.isArray(content.stories) || content.stories.length !== 3) {
  throw new Error('Pacote inválido: Stories precisa ter exatamente 3 telas.');
}

const forbidden = [
  'corre que vai acabar', 'últimas unidades', 'ultimas unidades', 'não perca', 'nao perca',
  'oferta imperdível', 'oferta imperdivel', 'compre agora', 'clique aqui', 'treinos intensos',
  'treino intenso', 'escolha dos consumidores', 'ideal para', 'perfeito para'
];
const serializedBeforeNormalize = JSON.stringify(content).toLowerCase();
for (const phrase of forbidden) {
  if (serializedBeforeNormalize.includes(phrase)) {
    throw new Error(`Pacote inválido: linguagem proibida detectada (${phrase}).`);
  }
}

const requiredCta = 'Confira na vitrine e siga @achadosdoethan';
const currentCaption = String(content.caption || '').trim().replace(/[.\s]+$/, '');
const needsVitrine = !currentCaption.toLowerCase().includes('confira na vitrine');
const needsHandle = !currentCaption.toLowerCase().includes('@achadosdoethan');
const suffixParts = [];
if (needsVitrine) suffixParts.push('Confira na vitrine');
if (needsHandle) suffixParts.push('siga @achadosdoethan');
content.caption = suffixParts.length > 0 ? `${currentCaption}. ${suffixParts.join(' e ')}.` : `${currentCaption}.`;
content.reel.endCta = requiredCta;
content.stories[2] = {
  ...content.stories[2],
  cta: 'Confira na vitrine · @achadosdoethan',
};
content.disclosure = 'Publicidade / link de afiliado. Preço e disponibilidade podem mudar.';

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
