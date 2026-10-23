import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const productsPath = path.join(root, 'src/data/products.json');
const outputDir = path.join(root, 'automation/output');
const outputPath = path.join(outputDir, 'candidates.json');

const maxCandidates = Number(process.env.MAX_CANDIDATES || 3);
const maxPrice = Number(process.env.MAX_PRICE || 80);

function parseBRL(value = '') {
  const numeric = String(value)
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractDiscount(label = '') {
  const match = String(label).match(/(\d{1,2})\s*%/);
  return match ? Number(match[1]) : 0;
}

function scoreProduct(product) {
  const price = parseBRL(product.price);
  let score = 0;
  const reasons = [];

  if (product.isNew) {
    score += 15;
    reasons.push('produto novo');
  }

  const badge = String(product.badge || '').toLowerCase();
  if (badge.includes('mais vendido')) {
    score += 25;
    reasons.push('mais vendido');
  }
  if (badge.includes('oferta')) {
    score += 15;
    reasons.push('oferta');
  }

  const discount = extractDiscount(product.priceLabel);
  if (discount >= 30) {
    score += 25;
    reasons.push(`desconto forte (${discount}%)`);
  } else if (discount >= 15) {
    score += 15;
    reasons.push(`bom desconto (${discount}%)`);
  } else if (discount > 0) {
    score += 5;
    reasons.push(`desconto (${discount}%)`);
  }

  if (price !== null && price <= 50) {
    score += 25;
    reasons.push('até R$ 50');
  } else if (price !== null && price <= maxPrice) {
    score += 10;
    reasons.push(`até R$ ${maxPrice}`);
  }

  if (product.image?.src) score += 5;
  if (String(product.url || '').startsWith('https://meli.la/')) score += 10;

  return { score, reasons, numericPrice: price };
}

const raw = await fs.readFile(productsPath, 'utf8');
const products = JSON.parse(raw);

const candidates = products
  .filter((product) => product?.title && product?.price && product?.url && product?.image?.src)
  .map((product) => ({ ...product, ...scoreProduct(product) }))
  .filter((product) => product.numericPrice !== null && product.numericPrice <= maxPrice)
  .sort((a, b) => b.score - a.score || a.numericPrice - b.numericPrice)
  .slice(0, maxCandidates)
  .map(({ id, title, category, price, priceLabel, badge, url, image, score, reasons }) => ({
    id,
    title,
    category,
    price,
    priceLabel,
    badge,
    url,
    image: image.src,
    score,
    reasons,
  }));

const result = {
  generatedAt: new Date().toISOString(),
  rules: {
    maxCandidates,
    maxPrice,
    priority: ['mais vendido', 'oferta', 'desconto', 'preço baixo', 'produto novo'],
  },
  candidates,
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(result, null, 2));
console.log(`\nArquivo criado: ${path.relative(root, outputPath)}`);
