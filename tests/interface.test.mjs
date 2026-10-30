import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { collections } from '../src/collections.js';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const expectedProductCount = products.length + 6;
const scriptPath = html.match(/<script[^>]*src="([^"]+)"/)[1];
const code = await readFile(new URL(`../dist${scriptPath}`, import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setTimeout(resolve, 60));

async function open(url = 'https://achadosdoethan.com.br/') {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('error', (...args) => errors.push(args.join(' ')));
  vc.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  dom.window.HTMLElement.prototype.scrollIntoView = function () { dom.scrolledTo = this.id; };
  dom.window.eval(code);
  await new Promise(resolve => setTimeout(resolve, 250));
  return { dom, window: dom.window, document: dom.window.document, errors };
}

test('hidrata a vitrine e mantém o catálogo navegável', async () => {
  const { dom, document, errors } = await open();
  try {
    assert.equal(document.querySelectorAll('article.card').length, expectedProductCount);
    const instagramLinks = [...document.querySelectorAll('.instagram-picks .instagram-list a')];
    assert.equal(instagramLinks[0].getAttribute('href'), 'https://achadosdoethan.com.br/produto/escova-eletrica-deckcasa-jy6010/');
    assert.match(instagramLinks[0].textContent, /R\$ 61,89/);
    assert.ok(!instagramLinks.some(link => link.getAttribute('href')?.includes('balanca-bahrein-cozinha')));
    assert.ok(!instagramLinks.some(link => link.getAttribute('href')?.includes('alicate-dobravel-descascador-fios')));
    assert.equal(document.querySelector('#arvore-natal-dekasa-150-500 .cta').href, 'https://meli.la/2Dkx5XQ');
    assert.equal(document.querySelector('#balanca-bahrein-cozinha .cta').href, 'https://meli.la/2QxXJfC');
    assert.equal(document.querySelector('#alicate-dobravel-descascador-fios .cta').href, 'https://meli.la/23WbJ2R');
    assert.equal(document.querySelector('#balanca-bahrein-cozinha .tag').textContent, 'Oferta');
    assert.match(document.querySelector('#alicate-dobravel-descascador-fios .tag').textContent, /^(Novo|Achado útil)$/);
    assert.equal(document.querySelector('#tenis-kappa-park-2 .cta').href, 'https://meli.la/1ujMeu9');
    assert.equal(document.querySelector('#luminaria-galaxy-360 .cta').href, 'https://meli.la/121io6Y');
    assert.equal(document.querySelector('#bluetooth-v10-capacete .cta').href, 'https://meli.la/2P9VtPs');
    assert.equal(document.querySelector('#kit-leggings .cta').href, 'https://meli.la/2zMoZpF');
    document.querySelector('[data-filter="Casa"]').click();
    await settle();
    assert.ok(document.querySelectorAll('article.card').length > 0);
    assert.ok([...document.querySelectorAll('article.card')].every(card => card.dataset.category === 'Casa'));
    document.querySelector('[data-filter="Todos"]').click();
    await settle();
    assert.equal(document.querySelectorAll('article.card').length, expectedProductCount);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('pesquisa sem resultado permite limpar filtros e voltar ao catálogo', async () => {
  const { dom, window, document, errors } = await open();
  try {
    const input = document.querySelector('#search');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'produto-inexistente-12345');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await settle();
    assert.equal(document.querySelectorAll('article.card').length, 0);
    assert.ok(document.querySelector('#empty-reset'));
    document.querySelector('#empty-reset').click();
    await settle();
    assert.equal(document.querySelectorAll('article.card').length, expectedProductCount);
    assert.equal(document.activeElement.id, 'search');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('restaura links filtrados e links diretos e mantém cupom funcional', async () => {
  const { dom, window, document, errors } = await open('https://achadosdoethan.com.br/?q=cal%C3%A7a&categoria=Moda');
  try {
    assert.ok(document.querySelector('#jeans'));
    assert.equal(document.querySelector('[data-filter="Moda"]').getAttribute('aria-pressed'), 'true');
    window.history.pushState(null, '', '/?categoria=Casa&q=torneira#kit-leggings');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await settle();
    assert.ok(document.querySelector('#kit-leggings'));
    assert.equal(document.querySelector('#search').value, '');
    assert.equal(document.querySelector('#kit-leggings .product-title-link').href, 'https://achadosdoethan.com.br/produto/kit-leggings/');
    assert.equal(document.querySelector('#kit-leggings .share-product'), null);
    let copied;
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async value => { copied = value; } }, configurable: true });
    document.querySelector('#copy-coupon').click();
    await settle();
    assert.equal(copied, 'POUPAMAIS');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('favoritos persistem, filtram e podem ser removidos sem cadastro', async () => {
 const {dom,window,document,errors}=await open();
 try {
  document.querySelector('#kit-leggings .favorite').click(); await settle();
  assert.deepEqual(JSON.parse(window.localStorage.getItem('ethan-favorites')),['kit-leggings']);
  document.querySelector('.saved-filter').click(); await settle();
  assert.equal(document.querySelectorAll('article.card').length,1);
  document.querySelector('#kit-leggings .favorite').click(); await settle();
  assert.equal(document.querySelectorAll('article.card').length,0);
  assert.match(document.querySelector('#empty').textContent,/favoritos começam aqui/);
  document.querySelector('#empty-reset').click(); await settle();
  assert.equal(document.querySelectorAll('article.card').length,expectedProductCount);
  assert.deepEqual(errors,[]);
 } finally {dom.window.close();}
});

test('coleção compartilhada restaura seleção e categoria permite sair dela', async () => {
 const {dom,window,document,errors}=await open('https://achadosdoethan.com.br/?colecao=looks-de-academia#produtos');
 try {
  assert.equal(document.querySelectorAll('article.card').length,collections.find(collection=>collection.id==='looks-de-academia').ids.length);
  assert.ok(document.querySelector('#kit-leggings'));
  assert.equal(document.querySelector('#result-text').textContent,'Looks de academia');
  document.querySelector('[data-filter="Casa"]').click();await settle();
  assert.ok([...document.querySelectorAll('article.card')].every(c=>c.dataset.category==='Casa'));
  assert.equal(new URL(window.location.href).searchParams.has('colecao'),false);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('painel de filtros fecha ao tocar fora e ao pressionar Escape', async () => {
  const { dom, window, document, errors } = await open();
  try {
    const panel = document.querySelector('.filter-panel');
    const summary = panel.querySelector('summary');

    summary.click();
    await settle();
    assert.equal(panel.open, true);

    document.querySelector('#search').dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
    await settle();
    assert.equal(panel.open, false);

    summary.click();
    await settle();
    assert.equal(panel.open, true);

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    assert.equal(panel.open, false);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('painel permite limpar preço e ordenação sem apagar outros filtros', async () => {
  const { dom, window, document, errors } = await open();
  try {
    const panel = document.querySelector('.filter-panel');
    const selects = panel.querySelectorAll('select');
    const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;

    document.querySelector('[data-filter="Casa"]').click();
    await settle();
    panel.querySelector('summary').click();
    await settle();

    selectSetter.call(selects[0], 'under50');
    selects[0].dispatchEvent(new window.Event('change', { bubbles: true }));
    selectSetter.call(selects[1], 'price-desc');
    selects[1].dispatchEvent(new window.Event('change', { bubbles: true }));
    await settle();

    assert.match(panel.querySelector('summary').textContent, /Filtros \(2\)/);
    assert.equal(document.querySelector('.filter-panel-clear').disabled, false);

    document.querySelector('.filter-panel-clear').click();
    await settle();

    assert.equal(selects[0].value, 'all');
    assert.equal(selects[1].value, 'featured');
    assert.equal(panel.open, false);
    assert.equal(document.querySelector('[data-filter="Casa"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
