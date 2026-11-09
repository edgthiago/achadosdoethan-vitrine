import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { categories, featuredProductId, matchesProduct, readCatalogLocation, catalogUrl, productUrl, shareProduct } from '../src/catalog.js';

const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));

test('catálogo mantém IDs únicos, preços e links de afiliado válidos', () => {
  assert.equal(new Set(products.map(p => p.id)).size, products.length);
  assert.ok(products.some(p => p.id === featuredProductId));
  for (const product of products) {
    assert.ok(categories.includes(product.category));
    assert.match(product.price, /^R\$\s*[\d.,]+$/);
    assert.ok(['meli.la', 's.shopee.com.br'].includes(new URL(product.url).hostname));
    assert.ok(product.title && product.image.src && product.image.alt && product.priceNote);
  }
});

test('busca ignora acentos e caixa, combina palavras e respeita categoria', () => {
  const jeans = products.find(p => p.id === 'jeans');
  assert.ok(matchesProduct(jeans, 'Moda', 'CALCA cintura'));
  assert.ok(!matchesProduct(jeans, 'Casa', 'CALCA'));
  assert.ok(!matchesProduct(jeans, 'Moda', 'calca ventilador'));
  assert.ok(products.filter(p => matchesProduct(p, 'Novos')).every(p => p.isNew));
});

test('link de um produto remove filtros que poderiam escondê-lo', () => {
  assert.deepEqual(readCatalogLocation('https://achadosdoethan.com.br/?categoria=Casa&q=torneira#kit-leggings', products), { category: 'Todos', query: '', marketplace: 'todos', productId: 'kit-leggings' });
  assert.equal(readCatalogLocation('https://achadosdoethan.com.br/?categoria=Inexistente', products).category, 'Todos');
  const url = catalogUrl('https://achadosdoethan.com.br/?utm_source=instagram', 'Moda', 'calça');
  assert.equal(new URL(url).searchParams.get('utm_source'), 'instagram');
  assert.equal(new URL(url).searchParams.get('q'), 'calça');
  assert.equal(productUrl(url, 'kit-leggings'), 'https://achadosdoethan.com.br/produto/kit-leggings/');
  const filtered = catalogUrl('https://achadosdoethan.com.br/produto/kit-leggings/', 'Casa', 'torneira');
  assert.deepEqual(readCatalogLocation(filtered, products), { category: 'Casa', query: 'torneira', marketplace: 'todos', productId: null });
});

test('compartilhamento usa API nativa ou copia o link exato do produto', async () => {
  const product = products[0];
  let payload, copied;
  assert.equal(await shareProduct(product, 'https://achadosdoethan.com.br/?q=teste', { share: async data => { payload = data; } }), 'shared');
  assert.equal(payload.url, productUrl('https://achadosdoethan.com.br/', product.id));
  assert.equal(await shareProduct(product, 'https://achadosdoethan.com.br/', { clipboard: { writeText: async text => { copied = text; } } }), 'copied');
  assert.equal(copied, payload.url);
  assert.equal(await shareProduct(product, 'https://achadosdoethan.com.br/', {}), payload.url);
});
