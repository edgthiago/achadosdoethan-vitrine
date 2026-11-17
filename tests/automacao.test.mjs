import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildProduct, addToCatalog, formatPrice, slugify, serializeCatalog, brazilTimestamp } from '../scripts/lib/catalogo.mjs';
import { buildReport, checkLinks, classify, collectLinks, stalePrices } from '../scripts/lib/saude.mjs';
import { priceValue } from '../src/catalog.js';

const raw = await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8');
const products = JSON.parse(raw);
const now = new Date('2026-11-17T22:30:00Z');
const base = { url: 'https://meli.la/novo123', titulo: 'Fritadeira elétrica 4 L', preco: '189,9', categoria: 'Casa', imagem: 'https://http2.mlstatic.com/foto.webp' };

test('catálogo é gravado sem reformatar o arquivo existente', () => {
  assert.equal(serializeCatalog(products), raw);
});

test('formata preços digitados de vários jeitos', () => {
  assert.equal(formatPrice('59,90'), 'R$ 59,90');
  assert.equal(formatPrice('R$ 1.189,9'), 'R$ 1.189,90');
  assert.equal(formatPrice('59.9'), 'R$ 59,90');
  assert.equal(formatPrice('1.299'), 'R$ 1.299,00');
  assert.throws(() => formatPrice('grátis'), /Preço inválido/);
  assert.throws(() => formatPrice('0'), /Preço inválido/);
});

test('gera ID de URL sem acentos e com tamanho limitado', () => {
  assert.equal(slugify('Fritadeira elétrica 4 L!'), 'fritadeira-eletrica-4-l');
  assert.ok(slugify('palavra '.repeat(30)).length <= 60);
  assert.doesNotMatch(slugify('Chinelo  Rider · 40/46'), /^-|-$|--/);
});

test('produto novo segue o mesmo formato do catálogo e passa nas regras dele', () => {
  const p = buildProduct(base, products, now);
  assert.equal(p.id, 'fritadeira-eletrica-4-l');
  assert.equal(p.price, 'R$ 189,90');
  assert.equal(priceValue(p), 189.9);
  assert.match(p.priceNote, /em 17\/11\/2026/);
  assert.equal(p.addedAt, '2026-11-17T19:30:00-03:00');
  assert.equal(p.image.alt, 'Fritadeira elétrica 4 L, imagem do anúncio no Mercado Livre');
  assert.equal(p.marketplace, undefined);
  const shopee = buildProduct({ ...base, url: 'https://s.shopee.com.br/abc', loja: 'shopee' }, products, now);
  assert.equal(shopee.marketplace, 'shopee');
  assert.equal(shopee.badge, 'Shopee');
  assert.match(shopee.image.alt, /na Shopee/);
  const next = addToCatalog(products, p);
  assert.equal(next[0].id, p.id);
  assert.equal(next.length, products.length + 1);
  assert.equal(new Set(next.map(x => x.id)).size, next.length);
  assert.equal(brazilTimestamp(new Date('2026-11-17T02:00:00Z')), '2026-11-16T23:00:00-03:00');
});

test('recusa dados que quebrariam a vitrine', () => {
  assert.throws(() => buildProduct({ ...base, url: 'https://s.shopee.com.br/x' }, products, now), /meli\.la/);
  assert.throws(() => buildProduct({ ...base, loja: 'amazon' }, products, now), /Loja inválida/);
  assert.throws(() => buildProduct({ ...base, categoria: 'Novos' }, products, now), /Categoria inválida/);
  assert.throws(() => buildProduct({ ...base, imagem: 'http://x.com/a.jpg' }, products, now), /https/);
  assert.throws(() => buildProduct({ ...base, titulo: '' }, products, now), /--titulo/);
  assert.throws(() => buildProduct({ ...base, url: products[0].url, id: 'outro-id' }, products, now), /já está no catálogo/);
  assert.throws(() => buildProduct({ ...base, id: products[0].id }, products, now), /Já existe/);
});

test('preços antigos são ordenados do mais velho para o mais novo', () => {
  const sample = [
    { id: 'novo', price: 'R$ 1,00', priceNote: 'em 10/11/2026' },
    { id: 'velho', price: 'R$ 1,00', priceNote: 'em 01/10/2026' },
    { id: 'sem-data', price: 'R$ 1,00', priceNote: '' }
  ];
  const stale = stalePrices(sample, Date.parse('2026-11-17T12:00:00-03:00'), 30);
  assert.deepEqual(stale.map(s => s.product.id), ['velho']);
  assert.equal(stale[0].ageDays, 47);
});

test('classifica respostas das lojas sem acusar bloqueio de robô como link quebrado', () => {
  assert.equal(classify(200), 'ok');
  assert.equal(classify(302), 'ok');
  assert.equal(classify(404), 'gone');
  assert.equal(classify(410), 'gone');
  assert.equal(classify(403), 'blocked');
  assert.equal(classify(429), 'blocked');
  assert.equal(classify(503), 'blocked');
});

test('verificação de links tenta de novo, limita a concorrência e relata erros de rede', async () => {
  let active = 0, peak = 0;
  const calls = {};
  const fetchImpl = async url => {
    calls[url] = (calls[url] || 0) + 1;
    active++; peak = Math.max(peak, active);
    await new Promise(r => setTimeout(r, 5));
    active--;
    if (url.endsWith('/queda')) throw Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    if (url.endsWith('/sumiu')) return { status: 404 };
    if (url.endsWith('/bloqueado')) return { status: 403 };
    return { status: 200 };
  };
  const urls = ['https://x.test/ok', 'https://x.test/sumiu', 'https://x.test/bloqueado', 'https://x.test/queda', ...Array.from({ length: 8 }, (_, i) => `https://x.test/ok${i}`)];
  const results = await checkLinks(urls, { fetchImpl, concurrency: 3 });
  assert.ok(peak <= 3);
  assert.equal(results.get('https://x.test/ok').kind, 'ok');
  assert.equal(results.get('https://x.test/sumiu').kind, 'gone');
  assert.equal(results.get('https://x.test/bloqueado').kind, 'blocked');
  assert.deepEqual(results.get('https://x.test/queda'), { kind: 'error', detail: 'ENOTFOUND' });
  assert.equal(calls['https://x.test/queda'], 2);
  assert.equal(calls['https://x.test/sumiu'], 1);
});

test('relatório lista links quebrados, preços antigos e produtos sem data', () => {
  const sample = [
    { id: 'a', url: 'https://x.test/a', price: 'R$ 10,00', priceNote: 'em 01/10/2026' },
    { id: 'b', url: 'https://x.test/b', price: 'R$ 20,00', priceNote: 'em 15/11/2026', otherOffer: { url: 'https://x.test/c' } },
    { id: 'c', url: 'https://x.test/d', price: 'R$ 30,00', priceNote: '' }
  ];
  const links = collectLinks(sample);
  assert.equal(links.size, 4);
  const linkResults = new Map([['https://x.test/a', { kind: 'ok' }], ['https://x.test/b', { kind: 'blocked' }], ['https://x.test/c', { kind: 'gone', status: 404 }], ['https://x.test/d', { kind: 'error', detail: 'ETIMEDOUT' }]]);
  const report = buildReport({ products: sample, now: Date.parse('2026-11-17T12:00:00-03:00'), linkResults, links });
  assert.equal(report.problems, 4);
  assert.equal(report.broken, 2);
  assert.match(report.markdown, /`b` \(comparação\).*não encontrado \(HTTP 404\)/);
  assert.match(report.markdown, /`c` \(principal\).*sem resposta \(ETIMEDOUT\)/);
  assert.match(report.markdown, /1 link\(s\) recusaram/);
  assert.match(report.markdown, /\| 01\/10\/2026 \| 47 \| R\$ 10,00 \| `a`/);
  assert.match(report.markdown, /Sem data de consulta \(1\)[\s\S]*`c`/);
  const clean = buildReport({ products: [{ id: 'z', url: 'https://x.test/z', price: 'R$ 1,00', priceNote: 'em 16/11/2026' }], now: Date.parse('2026-11-17T12:00:00-03:00'), linkResults: new Map([['https://x.test/z', { kind: 'ok' }]]) });
  assert.equal(clean.problems, 0);
  assert.match(clean.markdown, /Nenhum link com problema/);
});
