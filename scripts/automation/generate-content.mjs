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

const systemPrompt = `Você é o agente de conteúdo do projeto Achados do Ethan, perfil brasileiro de curadoria de ofertas com links de afiliado do Mercado Livre.

Escolha 1 produto entre os candidatos e crie conteúdo orgânico para Instagram.

Regras obrigatórias:
- português do Brasil;
- use SOMENTE fatos fornecidos;
- não invente preço, desconto, avaliação, estoque, frete, cupom, material, tamanho, benefício, desempenho, conforto, durabilidade ou indicação de uso;
- se houver selo "Mais vendido", apenas mencione o selo; não interprete como preferência dos consumidores;
- não use urgência/escassez falsa;
- preço e desconto podem mudar;
- Reel com EXATOS 18s e EXATAMENTE 6 cenas: 0-3, 3-6, 6-9, 9-12, 12-15, 15-18;
- gancho nos 3s iniciais baseado em título, categoria, preço, desconto ou selo real;
- textos de tela curtos;
- o visual usa somente a imagem fornecida, com zoom/corte/enquadramento; não invente outras imagens;
- cena final leva para a vitrine e pede para seguir @achadosdoethan;
- legenda em 2 a 4 frases curtas;
- Stories com EXATAMENTE 3 telas: atenção, dado objetivo, CTA;
- hashtags entre 6 e 8, específicas e sem erros;
- deixe claro que há publicidade/link de afiliado.

Retorne SOMENTE JSON válido, sem markdown:
{
  "selectedProductId":"string",
  "selectionReason":"string curta",
  "reel":{
    "hook":"string",
    "durationSeconds":18,
    "scenes":[
      {"from":0,"to":3,"visual":"string","text":"string","voiceover":"string"},
      {"from":3,"to":6,"visual":"string","text":"string","voiceover":"string"},
      {"from":6,"to":9,"visual":"string","text":"string","voiceover":"string"},
      {"from":9,"to":12,"visual":"string","text":"string","voiceover":"string"},
      {"from":12,"to":15,"visual":"string","text":"string","voiceover":"string"},
      {"from":15,"to":18,"visual":"string","text":"string","voiceover":"string"}
    ],
    "endCta":"string"
  },
  "caption":"string",
  "hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6"],
  "stories":[
    {"frame":1,"headline":"string","support":"string","cta":"string"},
    {"frame":2,"headline":"string","support":"string","cta":"string"},
    {"frame":3,"headline":"string","support":"string","cta":"string"}
  ],
  "disclosure":"Publicidade / link de afiliado. Preço e disponibilidade podem mudar."
}`;

const userPrompt = `Use somente estes candidatos:\n${JSON.stringify(selection.candidates, null, 2)}`;
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
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
if (!text) throw new Error('Workers AI não retornou texto.');

let content;
try {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  content = JSON.parse(cleaned);
} catch (error) {
  throw new Error(`Resposta da IA não é JSON válido: ${error.message}`);
}

const selected = selection.candidates.find((item) => item.id === content.selectedProductId);
if (!selected) throw new Error(`A IA selecionou um produto desconhecido: ${content.selectedProductId}`);

const safeReplacements = [
  [/corre que vai acabar/gi, 'Confira na vitrine'],
  [/últimas unidades/gi, 'Confira a disponibilidade'],
  [/ultimas unidades/gi, 'Confira a disponibilidade'],
  [/não perca(?: essa oportunidade)?/gi, 'Confira na vitrine'],
  [/nao perca(?: essa oportunidade)?/gi, 'Confira na vitrine'],
  [/oferta imperdível/gi, 'oferta'],
  [/oferta imperdivel/gi, 'oferta'],
  [/compre agora/gi, 'Confira na vitrine'],
  [/clique aqui/gi, 'Veja na vitrine'],
  [/treinos intensos/gi, 'detalhes no anúncio'],
  [/treino intenso/gi, 'detalhes no anúncio'],
  [/escolha dos consumidores/gi, 'selo Mais vendido'],
  [/ideal para[^.!?]*/gi, 'Confira os detalhes no anúncio'],
  [/perfeito para[^.!?]*/gi, 'Confira os detalhes no anúncio'],
];

function sanitize(value) {
  if (typeof value === 'string') {
    return safeReplacements.reduce((textValue, [pattern, replacement]) => textValue.replace(pattern, replacement), value).trim();
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}
content = sanitize(content);

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

const requiredCta = 'Confira na vitrine e siga @achadosdoethan';
const currentCaption = String(content.caption || '').trim().replace(/[.\s]+$/, '');
const suffixParts = [];
if (!currentCaption.toLowerCase().includes('confira na vitrine')) suffixParts.push('Confira na vitrine');
if (!currentCaption.toLowerCase().includes('@achadosdoethan')) suffixParts.push('siga @achadosdoethan');
content.caption = suffixParts.length ? `${currentCaption}. ${suffixParts.join(' e ')}.` : `${currentCaption}.`;
content.reel.endCta = requiredCta;
content.stories[2] = { ...content.stories[2], cta: 'Confira na vitrine · @achadosdoethan' };
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
