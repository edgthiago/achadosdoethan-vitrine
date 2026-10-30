import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const outputDir = path.join(root, 'automation/output');
const historyPath = path.join(root, 'automation/history/garimpo-history.json');
const vitrinePath = path.join(root, 'src/data/products.json');

const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 15);
const MIN_POOL = Number(process.env.MIN_POOL || 60);
const SEARCH_LIMIT = Number(process.env.SEARCH_LIMIT || 25);
const MELI_TOKEN = process.env.MELI_ACCESS_TOKEN || '';

const searches = [
  { q: 'utilidades domesticas', category: 'Utilidades domésticas' },
  { q: 'organizador cozinha', category: 'Cozinha e organização' },
  { q: 'utensilios cozinha', category: 'Cozinha' },
  { q: 'organizador casa', category: 'Organização' },
  { q: 'moda feminina conjunto', category: 'Moda feminina' },
  { q: 'legging feminina', category: 'Moda feminina' },
  { q: 'beleza autocuidado', category: 'Beleza e autocuidado' },
  { q: 'acessorios celular', category: 'Celular e acessórios' },
  { q: 'fone bluetooth', category: 'Eletrônicos' },
  { q: 'luminaria led', category: 'Casa e decoração' },
  { q: 'produto viral casa', category: 'Virais e curiosos' },
  { q: 'achadinhos baratos', category: 'Achados de baixo custo' },
];

const blockedTerms = [
  'cerveja', 'vinho', 'whisky', 'vodka', 'gin ', 'cachaça', 'licor',
  'cigarro', 'vape', 'pod descartavel', 'pod descartável', 'nicotina', 'narguile',
  'canivete', 'faca tática', 'faca tatica', 'taser', 'spray de pimenta',
  'arma de fogo', 'munição', 'municao', 'airsoft',
  'anabolizante', 'esteroide', 'hormônio', 'hormonio', 'emagrecedor',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalize(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text) {
  return new Set(normalize(text).split(' ').filter((word) => word.length >= 3));
}

function similarity(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const item of A) if (B.has(item)) intersection += 1;
  return intersection / (A.size + B.size - intersection);
}

function priceBand(price) {
  if (price <= 50) return 'Até R$ 50';
  if (price <= 100) return 'R$ 50 a R$ 100';
  if (price <= 200) return 'R$ 100 a R$ 200';
  return 'Acima de R$ 200';
}

function discountPct(price, originalPrice) {
  if (!Number.isFinite(price) || !Number.isFinite(originalPrice) || originalPrice <= price) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}

function scoreItem(item) {
  const price = Number(item.price);
  const original = Number(item.original_price);
  const discount = discountPct(price, original);
  const sold = Number(item.sold_quantity || 0);
  const rating = Number(item.reviews?.rating_average || item.rating_average || 0);
  const reviews = Number(item.reviews?.total || item.reviews_count || 0);
  let score = 0;
  const reasons = [];

  if (discount >= 35) { score += 24; reasons.push(`${discount}% de desconto`); }
  else if (discount >= 20) { score += 17; reasons.push(`${discount}% de desconto`); }
  else if (discount >= 10) { score += 10; reasons.push(`${discount}% de desconto`); }
  else if (discount > 0) { score += 5; reasons.push(`${discount}% de desconto`); }

  if (price <= 50) { score += 20; reasons.push('compra de baixo valor'); }
  else if (price <= 100) { score += 17; reasons.push('preço de compra por impulso'); }
  else if (price <= 200) { score += 12; reasons.push('faixa intermediária'); }
  else { score += 2; }

  if (sold >= 5000) { score += 20; reasons.push('alto volume de vendas'); }
  else if (sold >= 1000) { score += 16; reasons.push('bom volume de vendas'); }
  else if (sold >= 500) { score += 12; reasons.push('vendas relevantes'); }
  else if (sold >= 100) { score += 8; }
  else if (sold >= 10) { score += 4; }

  if (item.shipping?.free_shipping) { score += 9; reasons.push('frete grátis'); }

  if (rating >= 4.8) { score += 10; reasons.push(`avaliação ${rating.toFixed(1)}`); }
  else if (rating >= 4.5) { score += 7; reasons.push(`avaliação ${rating.toFixed(1)}`); }
  else if (rating >= 4.0) score += 3;
  if (reviews >= 500) score += 3;

  const title = normalize(item.title);
  if (/\b(kit|jogo|combo|mini|portatil|dobravel|organizador|sem fio|led|2 em 1|3 em 1|conjunto)\b/.test(title)) {
    score += 5;
    reasons.push('bom apelo visual/funcional');
  }
  if (item.official_store_id) score += 3;
  if (item.thumbnail || item.secure_thumbnail) score += 3;
  if (item.permalink) score += 3;
  if (String(item.condition || '').toLowerCase() === 'new') score += 3;

  return {
    rawScore: Math.min(100, score),
    score: Math.min(10, score / 10),
    discount,
    sold,
    rating: rating || null,
    reviews: reviews || null,
    reasons,
  };
}

async function fetchJson(url) {
  const headers = {
    'User-Agent': 'AchadosDoEthan-Garimpo/1.0',
    Accept: 'application/json',
  };
  if (MELI_TOKEN) headers.Authorization = `Bearer ${MELI_TOKEN}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { headers });
    if (response.status === 429 && attempt < 3) {
      await sleep(attempt * 1500);
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Mercado Livre recusou a busca (HTTP ${response.status}). Configure MELI_ACCESS_TOKEN se a API exigir autenticação.`);
    }
    if (!response.ok) throw new Error(`Mercado Livre respondeu HTTP ${response.status} para ${url}`);
    return response.json();
  }
  throw new Error(`Falha após tentativas em ${url}`);
}

async function loadJson(filepath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filepath, 'utf8'));
  } catch {
    return fallback;
  }
}

const history = await loadJson(historyPath, []);
const vitrine = await loadJson(vitrinePath, []);
const historyIds = new Set(history.map((item) => item.id).filter(Boolean));
const historyUrls = new Set(history.map((item) => item.mercadoLivreUrl).filter(Boolean));
const vitrineTitles = vitrine.map((item) => item.title).filter(Boolean);

const collected = new Map();
const errors = [];
for (const search of searches) {
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(search.q)}&limit=${SEARCH_LIMIT}`;
    const payload = await fetchJson(url);
    for (const item of payload.results || []) {
      if (!item?.id || !item?.title || !item?.permalink || !Number.isFinite(Number(item.price))) continue;
      if (Number(item.price) > 250) continue;
      const normalizedTitle = normalize(item.title);
      if (blockedTerms.some((term) => normalizedTitle.includes(normalize(term)))) continue;
      if (historyIds.has(item.id) || historyUrls.has(item.permalink)) continue;
      if (vitrineTitles.some((title) => similarity(title, item.title) >= 0.82)) continue;
      if (!collected.has(item.id)) collected.set(item.id, { ...item, _category: search.category, _query: search.q });
    }
    if (collected.size >= MIN_POOL * 2) break;
    await sleep(250);
  } catch (error) {
    errors.push(`${search.q}: ${error.message}`);
  }
}

if (collected.size === 0) {
  throw new Error(`Nenhum produto coletado. ${errors.join(' | ')}`);
}

const ranked = [...collected.values()]
  .map((item) => ({ ...item, ...scoreItem(item) }))
  .filter((item) => item.price <= 200)
  .sort((a, b) => b.rawScore - a.rawScore || a.price - b.price);

function tooSimilarToSelected(candidate, selected) {
  return selected.some((item) => similarity(item.title, candidate.title) >= 0.72);
}

function categoryCount(selected, category) {
  return selected.filter((item) => item._category === category).length;
}

const selected = [];
const bands = [
  { name: 'Até R$ 50', test: (p) => p <= 50, target: 5 },
  { name: 'R$ 50 a R$ 100', test: (p) => p > 50 && p <= 100, target: 5 },
  { name: 'R$ 100 a R$ 200', test: (p) => p > 100 && p <= 200, target: 5 },
];

for (const band of bands) {
  for (const item of ranked) {
    if (selected.filter((x) => band.test(x.price)).length >= band.target) break;
    if (!band.test(item.price)) continue;
    if (selected.some((x) => x.id === item.id)) continue;
    if (tooSimilarToSelected(item, selected)) continue;
    if (categoryCount(selected, item._category) >= 3) continue;
    selected.push(item);
  }
}

for (const item of ranked) {
  if (selected.length >= DAILY_LIMIT) break;
  if (selected.some((x) => x.id === item.id)) continue;
  if (tooSimilarToSelected(item, selected)) continue;
  if (categoryCount(selected, item._category) >= 4) continue;
  selected.push(item);
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function selectionReason(item) {
  const facts = [];
  if (item.discount > 0) facts.push(`${item.discount}% OFF`);
  if (item.shipping?.free_shipping) facts.push('frete grátis');
  if (item.sold >= 100) facts.push(`${item.sold}+ vendidos`);
  if (item.rating) facts.push(`nota ${item.rating.toFixed(1)}`);
  if (!facts.length) facts.push('bom equilíbrio entre preço e apelo do produto');
  return `${formatBRL(item.price)} · ${facts.slice(0, 3).join(' · ')}`;
}

function hook(item) {
  if (item.discount >= 20) return `Achei ${item.discount}% OFF nesse produto por ${formatBRL(item.price)}.`;
  if (item.price <= 50) return `Achado por menos de R$ 50: ${item.title}.`;
  if (item.shipping?.free_shipping) return `${item.title} por ${formatBRL(item.price)} com frete grátis.`;
  return `Vale olhar este achado por ${formatBRL(item.price)}.`;
}

const now = new Date().toISOString();
const output = selected.slice(0, DAILY_LIMIT).map((item, index) => ({
  rank: index + 1,
  foundAt: now,
  id: item.id,
  product: item.title,
  category: item._category,
  searchQuery: item._query,
  price: Number(item.price),
  previousPrice: Number.isFinite(Number(item.original_price)) && Number(item.original_price) > item.price ? Number(item.original_price) : null,
  discountPercent: item.discount || 0,
  rating: item.rating,
  reviewCount: item.reviews,
  soldQuantity: item.sold || null,
  freeShipping: Boolean(item.shipping?.free_shipping),
  score: Number(item.score.toFixed(1)),
  priceBand: priceBand(item.price),
  reason: selectionReason(item),
  hook: hook(item),
  image: item.secure_thumbnail || item.thumbnail || null,
  mercadoLivreUrl: item.permalink,
  affiliateUrl: '',
  status: 'AGUARDANDO LINK DE AFILIADO',
}));

const result = {
  generatedAt: now,
  site: 'MLB',
  rules: {
    minimumPoolTarget: MIN_POOL,
    dailyLimit: DAILY_LIMIT,
    priceBands: ['Até R$ 50', 'R$ 50 a R$ 100', 'R$ 100 a R$ 200'],
    affiliateLinkGeneratedAutomatically: false,
  },
  summary: {
    searchesExecuted: searches.length,
    uniqueProductsCollected: collected.size,
    productsAfterRanking: ranked.length,
    productsSelected: output.length,
    repeatedOrExistingProductsIgnored: historyIds.size + vitrineTitles.length,
    warnings: errors,
  },
  products: output,
};

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const columns = [
  ['Data', (p) => p.foundAt],
  ['Produto', (p) => p.product],
  ['Categoria', (p) => p.category],
  ['Preço', (p) => formatBRL(p.price)],
  ['Preço anterior', (p) => p.previousPrice ? formatBRL(p.previousPrice) : 'Não informado'],
  ['Desconto', (p) => p.discountPercent ? `${p.discountPercent}%` : 'Não informado'],
  ['Avaliação', (p) => p.rating ?? 'Não informado'],
  ['Avaliações', (p) => p.reviewCount ?? 'Não informado'],
  ['Vendas', (p) => p.soldQuantity ?? 'Não informado'],
  ['Frete grátis', (p) => p.freeShipping ? 'Sim' : 'Não informado'],
  ['Nota', (p) => `${p.score}/10`],
  ['Motivo', (p) => p.reason],
  ['Gancho', (p) => p.hook],
  ['Link Mercado Livre', (p) => p.mercadoLivreUrl],
  ['Link Afiliado', (p) => p.affiliateUrl],
  ['Status', (p) => p.status],
];

const csv = [
  columns.map(([name]) => csvCell(name)).join(','),
  ...output.map((p) => columns.map(([, getter]) => csvCell(getter(p))).join(',')),
].join('\n') + '\n';

const mdRows = output.map((p) => `| ${p.rank} | ${p.product.replaceAll('|', '/')} | ${formatBRL(p.price)} | ${p.discountPercent ? `${p.discountPercent}%` : '—'} | ${p.score}/10 | [Abrir](${p.mercadoLivreUrl}) | ${p.status} |`).join('\n');
const markdown = `# Garimpo diário — Achados do Ethan\n\nGerado em: ${now}\n\n- Produtos coletados: **${collected.size}**\n- Produtos selecionados: **${output.length}**\n- Meta de análise: **${MIN_POOL}+ candidatos**\n- Link afiliado: **preenchimento manual**\n\n| # | Produto | Preço | Desconto | Nota | Mercado Livre | Status |\n|---:|---|---:|---:|---:|---|---|\n${mdRows}\n`;

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(path.dirname(historyPath), { recursive: true });
await fs.writeFile(path.join(outputDir, 'garimpo-daily.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
await fs.writeFile(path.join(outputDir, 'garimpo-daily.csv'), csv, 'utf8');
await fs.writeFile(path.join(outputDir, 'garimpo-daily.md'), markdown, 'utf8');

const updatedHistory = [
  ...history,
  ...output.map((p) => ({ id: p.id, title: p.product, mercadoLivreUrl: p.mercadoLivreUrl, selectedAt: now })),
].slice(-1500);
await fs.writeFile(historyPath, `${JSON.stringify(updatedHistory, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(result.summary, null, 2));
console.log(`Garimpo concluído: ${output.length} produtos selecionados.`);
console.log('O link de afiliado permanece vazio para preenchimento manual.');
