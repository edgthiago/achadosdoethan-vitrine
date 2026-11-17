import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { priceCheckedAt, isPriceStale, selectProducts, splitPriceLabel, cardBadge, previousPrice } from '../src/catalog.js';
import { coupon } from '../src/siteConfig.js';

const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const indexHtml = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const scriptPath = indexHtml.match(/<script[^>]*src="([^"]+)"/)[1];
const code = await readFile(new URL(`../dist${scriptPath}`, import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setTimeout(resolve, 60));

async function open(html, url) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('error', (...args) => errors.push(args.join(' ')));
  vc.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.eval(code);
  await new Promise(resolve => setTimeout(resolve, 250));
  return { dom, window: dom.window, document: dom.window.document, errors };
}

test('data de consulta do preço é lida da nota e envelhece após o limite', () => {
  const p = { priceNote: 'Preço consultado em 16/10/2026. Confira no anúncio.' };
  assert.equal(priceCheckedAt(p), Date.parse('2026-10-16T00:00:00-03:00'));
  assert.equal(priceCheckedAt({ priceNote: 'sem data' }), null);
  assert.equal(isPriceStale(p, Date.parse('2026-11-14T23:59:00-03:00'), 30), false);
  assert.equal(isPriceStale(p, Date.parse('2026-11-15T00:00:00-03:00'), 30), true);
  assert.equal(isPriceStale({ priceNote: '' }, Date.now(), 30), false);
});

test('ordenação "Mais recentes" usa addedAt e deixa itens sem data no fim', () => {
  const sample = [
    { id: 'a', title: 'a', search: '', price: 'R$ 1,00', addedAt: '2026-10-01T00:00:00-03:00' },
    { id: 'b', title: 'b', search: '', price: 'R$ 1,00' },
    { id: 'c', title: 'c', search: '', price: 'R$ 1,00', addedAt: '2026-11-01T00:00:00-03:00' }
  ];
  assert.deepEqual(selectProducts(sample, 'Todos', '', 'all', 'recent').map(p => p.id), ['c', 'a', 'b']);
});

test('vitrine avisa preço antigo, mostra contagem por categoria e ordena por recentes', async () => {
  const { dom, window, document, errors } = await open(indexHtml, 'https://achadosdoethan.com.br/');
  try {
    const stale = products.find(p => isPriceStale(p, Date.now(), 30));
    if (stale) assert.match(document.querySelector(`#${stale.id} .price-age`).textContent, /pode ter mudado/);
    const fresh = products.find(p => priceCheckedAt(p) !== null && !isPriceStale(p, Date.now(), 30));
    if (fresh) assert.equal(document.querySelector(`#${fresh.id} .price-age`), null);

    const casa = products.filter(p => p.category === 'Casa').length;
    assert.equal(document.querySelector('[data-filter="Casa"] .filter-count').textContent, String(casa));
    assert.equal(document.querySelector('[data-filter="Todos"] .filter-count').textContent, String(products.length));

    const select = document.querySelectorAll('.filter-panel select')[1];
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, 'recent');
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    await settle();
    const newest = [...products].sort((a, b) => (Date.parse(b.addedAt) || 0) - (Date.parse(a.addedAt) || 0))[0];
    assert.equal(document.querySelector('article.card').id, newest.id);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('cupom vem da configuração', async () => {
  assert.match(indexHtml, new RegExp(`class="coupon-code">${coupon.code}<`));
});

test('página 404 não é indexada, hidrata e leva de volta à vitrine', async () => {
  const html = await readFile(new URL('../dist/404.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(html, /rel="canonical"/);
  const { dom, document, errors } = await open(html, 'https://achadosdoethan.com.br/produto/removido/');
  try {
    assert.equal(document.querySelector('h1').textContent, 'Esse achado saiu da vitrine');
    assert.equal(document.querySelector('.not-found-cta').getAttribute('href'), '/#produtos');
    assert.ok(document.querySelectorAll('.related .instagram-list a').length > 0);
    assert.equal(dom.window.location.pathname, '/produto/removido/');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
  const wrangler = JSON.parse(await readFile(new URL('../wrangler.json', import.meta.url), 'utf8'));
  assert.equal(wrangler.assets.not_found_handling, '404-page');
});

test('manifesto do app aponta para ícones existentes', async () => {
  assert.match(indexHtml, /<link rel="manifest" href="\/manifest.webmanifest">/);
  assert.match(indexHtml, /<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon.png">/);
  const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) await access(new URL(`../dist${icon.src}`, import.meta.url));
  await access(new URL('../dist/icons/apple-touch-icon.png', import.meta.url));
});

test('rótulo de preço vira selo de desconto e o resto fica ao lado do preço', () => {
  assert.deepEqual(splitPriceLabel('40% OFF'), { discount: 40, rest: '' });
  assert.deepEqual(splitPriceLabel('49% OFF no Pix'), { discount: 49, rest: 'no Pix' });
  assert.deepEqual(splitPriceLabel('no Pix · 48% OFF'), { discount: 48, rest: 'no Pix' });
  assert.deepEqual(splitPriceLabel('30% OFF no Pix + cupom'), { discount: 30, rest: 'no Pix + cupom' });
  assert.deepEqual(splitPriceLabel('Preço consultado'), { discount: null, rest: 'Preço consultado' });
  assert.deepEqual(splitPriceLabel('95% OFF'), { discount: null, rest: '95% OFF' });
  assert.deepEqual(splitPriceLabel(undefined), { discount: null, rest: '' });
});

test('selo do card não repete oferta nem categoria', () => {
  const p = { badge: 'Mais vendido · Oferta', category: 'Casa' };
  assert.equal(cardBadge(p, true), 'Mais vendido');
  assert.equal(cardBadge(p, false), 'Mais vendido · Oferta');
  assert.equal(cardBadge({ badge: 'Moda · Oferta', category: 'Moda' }, true), null);
  assert.equal(cardBadge({ badge: 'Casa', category: 'Casa' }), null);
  assert.equal(cardBadge({ badge: 'Oferta', category: 'Casa' }, false), 'Oferta');
  assert.equal(cardBadge({ category: 'Casa' }, true), null);
});

test('preço antigo só aparece quando é maior que o atual', () => {
  assert.equal(previousPrice({ price: 'R$ 85,49', oldPrice: 'R$ 169,99' }), 'R$ 169,99');
  assert.equal(previousPrice({ price: 'R$ 85,49', oldPrice: 'R$ 50,00' }), null);
  assert.equal(previousPrice({ price: 'R$ 85,49' }), null);
});

test('cards mostram selo de desconto, preço antigo riscado e barra fixa de busca', async () => {
  const { dom, document, errors } = await open(indexHtml, 'https://achadosdoethan.com.br/');
  try {
    const target = products.find(p => p.oldPrice && splitPriceLabel(p.priceLabel).discount);
    const card = document.getElementById(target.id);
    const { discount, rest } = splitPriceLabel(target.priceLabel);
    assert.equal(card.querySelector('.visual .discount').textContent, `-${discount}%`);
    assert.equal(card.querySelector('.price-old').textContent.replace('Preço anterior ', ''), target.oldPrice);
    assert.doesNotMatch(card.querySelector('.tag')?.textContent || '', /Oferta/);
    assert.doesNotMatch(card.querySelector('.price-row').textContent, /% OFF/);
    if (rest) assert.match(card.querySelector('.price-row').textContent, new RegExp(rest));

    const plain = document.querySelector('#balanca-bahrein-cozinha');
    assert.equal(plain.querySelector('.discount'), null);
    assert.equal(plain.querySelector('.price-old'), null);
    assert.equal(plain.querySelector('.tag').textContent, 'Oferta');

    const sticky = document.querySelector('.catalog-sticky');
    assert.ok(sticky.querySelector('#search'));
    assert.ok(sticky.querySelector('[data-filter="Todos"]'));
    const subbar = document.querySelector('.catalog-subbar');
    assert.ok(subbar.querySelector('.marketplace-filters'));
    assert.ok(subbar.querySelector('.filter-panel'));
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
