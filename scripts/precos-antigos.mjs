// Lista produtos cujo preço foi consultado há mais de N dias (padrão: stalePriceDays).
// Uso: npm run precos-antigos            -> usa o limite do siteConfig
//      npm run precos-antigos -- 15      -> limite de 15 dias
import { readFile } from 'node:fs/promises';
import { priceCheckedAt } from '../src/catalog.js';
import { stalePriceDays } from '../src/siteConfig.js';

const days = Number(process.argv[2]) || stalePriceDays;
const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const now = Date.now();
const rows = products
  .map(p => ({ p, checked: priceCheckedAt(p) }))
  .filter(({ checked }) => checked === null || now - checked >= days * 86400000)
  .sort((a, b) => (a.checked ?? 0) - (b.checked ?? 0));

const fmt = ts => ts === null ? 'sem data  ' : new Date(ts).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
console.log(`${rows.length} de ${products.length} produtos com preço consultado há ${days}+ dias ou sem data:\n`);
for (const { p, checked } of rows) console.log(`${fmt(checked)}  ${p.price.padEnd(11)} ${p.id}\n             ${p.url}`);
