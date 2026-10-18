import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
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
  await settle();
  return { dom, window: dom.window, document: dom.window.document, errors };
}

test('hidrata a vitrine e mantém o catálogo navegável', async () => {
  const { dom, document, errors } = await open();
  try {
    assert.equal(document.querySelectorAll('article.card').length, products.length);
    assert.equal(document.querySelector('.hero-visual').getAttribute('href'), '#kit-leggings');
    assert.equal(document.querySelector('#kit-leggings .cta').href, 'https://meli.la/2zMoZpF');
    document.querySelector('[data-filter="Casa"]').click();
    await settle();
    assert.ok(document.querySelectorAll('article.card').length > 0);
    assert.ok([...document.querySelectorAll('article.card')].every(card => card.dataset.category === 'Casa'));
    document.querySelector('.hero-visual').click();
    await settle();
    assert.equal(document.querySelectorAll('article.card').length, products.length);
    assert.equal(dom.scrolledTo, 'kit-leggings');
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
    assert.equal(document.querySelectorAll('article.card').length, products.length);
    assert.equal(document.activeElement.id, 'search');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('restaura links filtrados e links diretos, copia produto e cupom', async () => {
  const { dom, window, document, errors } = await open('https://achadosdoethan.com.br/?q=cal%C3%A7a&categoria=Moda');
  try {
    assert.ok(document.querySelector('#jeans'));
    assert.equal(document.querySelector('[data-filter="Moda"]').getAttribute('aria-pressed'), 'true');
    window.history.pushState(null, '', '/?categoria=Casa&q=torneira#kit-leggings');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await settle();
    assert.ok(document.querySelector('#kit-leggings'));
    assert.equal(document.querySelector('#search').value, '');
    let copied;
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async value => { copied = value; } }, configurable: true });
    document.querySelector('#kit-leggings .share-product').click();
    await settle();
    assert.equal(copied, 'https://achadosdoethan.com.br/produto/kit-leggings/');
    document.querySelector('#copy-coupon').click();
    await settle();
    assert.equal(copied, 'POUPAMAIS');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
