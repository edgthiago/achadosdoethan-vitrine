import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { instagramPickIds } from '../src/instagramPicks.js';
import { priceValue } from '../src/catalog.js';

const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const byId = new Map(products.map(p => [p.id, p]));

test('achados do Instagram apontam para produtos reais, sem repetição', () => {
  assert.equal(new Set(instagramPickIds).size, instagramPickIds.length);
  for (const id of instagramPickIds) assert.ok(byId.has(id), `Produto inexistente em instagramPickIds: ${id}`);
});

test('produtos têm ID de URL, imagem dimensionada e data válida', async () => {
  for (const p of products) {
    assert.match(p.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `ID inválido: ${p.id}`);
    assert.ok(Number.isInteger(p.image.width) && Number.isInteger(p.image.height), `Imagem sem dimensões: ${p.id}`);
    assert.ok(priceValue(p) > 0, `Preço inválido: ${p.id}`);
    if (p.addedAt) assert.ok(!Number.isNaN(Date.parse(p.addedAt)), `addedAt inválido: ${p.id}`);
    if (p.image.src.startsWith('/')) await access(new URL(`../public${p.image.src}`, import.meta.url));
    else assert.equal(new URL(p.image.src).protocol, 'https:');
  }
});

test('loja informada corresponde ao link de afiliado', () => {
  for (const p of products) {
    const host = new URL(p.url).hostname;
    assert.equal(host === 's.shopee.com.br', p.marketplace === 'shopee', `Loja e link divergem: ${p.id}`);
    if (p.otherOffer) assert.ok(['meli.la', 's.shopee.com.br'].includes(new URL(p.otherOffer.url).hostname), `Link de comparação inválido: ${p.id}`);
  }
});

test('páginas de produto publicam dados estruturados de Product com preço em BRL', async () => {
  for (const p of products) {
    const html = await readFile(new URL(`../dist/produto/${p.id}/index.html`, import.meta.url), 'utf8');
    const match = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    assert.ok(match, `JSON-LD ausente: ${p.id}`);
    const data = JSON.parse(match[1]);
    assert.equal(data['@type'], 'Product');
    assert.equal(data.name, p.title);
    assert.equal(data.url, `https://achadosdoethan.com.br/produto/${p.id}/`);
    assert.match(data.image[0], /^https:\/\//);
    assert.equal(data.offers.priceCurrency, 'BRL');
    assert.equal(Number(data.offers.price), priceValue(p));
    assert.match(html, /<meta property="og:image" content="https:\/\//);
  }
});

test('robots.txt indica o sitemap com todas as páginas', async () => {
  const robots = await readFile(new URL('../dist/robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /^Sitemap: https:\/\/achadosdoethan\.com\.br\/sitemap\.xml$/m);
  const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  assert.equal(sitemap.match(/<loc>/g).length, products.length + 1);
});
