import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { selectProducts, priceValue } from '../src/catalog.js';
const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
test('cada página entrega foto, URL e produto corretos antes de executar JavaScript', async () => {
 for (const p of products) {
  const html = await readFile(new URL(`../dist/produto/${p.id}/index.html`, import.meta.url), 'utf8');
  const dom = new JSDOM(html); const d = dom.window.document;
  assert.equal(d.querySelector('meta[property="og:image"]').content, p.image.src);
  assert.equal(d.querySelector('link[rel="canonical"]').href, `https://achadosdoethan.com.br/produto/${p.id}/`);
  assert.equal(d.querySelectorAll('article.card').length, 1);
  assert.equal(d.querySelector('.cta').href, p.url);
  dom.window.close();
 }
});
test('página individual hidrata sem perder produto nem link de afiliado', async () => {
 const html = await readFile(new URL('../dist/produto/kit-leggings/index.html', import.meta.url), 'utf8');
 const errors = []; const vc = new VirtualConsole(); vc.on('error', (...args) => errors.push(args.join(' '))); vc.on('jsdomError', e => errors.push(e.message));
 const dom = new JSDOM(html, {url:'https://achadosdoethan.com.br/produto/kit-leggings/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 dom.window.HTMLElement.prototype.scrollIntoView = function() {};
 const script = dom.window.document.querySelector('script[type="module"]').getAttribute('src');
 dom.window.eval(await readFile(new URL('../dist'+script, import.meta.url), 'utf8'));
 await new Promise(r => setTimeout(r,100));
 assert.equal(dom.window.document.querySelectorAll('article.card').length, 1);
 assert.equal(dom.window.document.querySelector('.cta').href, products.find(p => p.id === 'kit-leggings').url);
 assert.deepEqual(errors, []); dom.window.close();
});
test('preços em reais ordenam numericamente e faixas não se sobrepõem', () => {
 const sample = [{title:'A',search:'',category:'Casa',price:'R$ 1.200,00'},{title:'B',search:'',category:'Casa',price:'R$ 50,00'},{title:'C',search:'',category:'Casa',price:'R$ 49,90'}];
 assert.deepEqual(selectProducts(sample,'Todos','','all','price-asc').map(priceValue), [49.9,50,1200]);
 assert.equal(selectProducts(sample,'Todos','','under50').length,1);
 assert.equal(selectProducts(sample,'Todos','','from50to100')[0].title,'B');
 assert.equal(sample[0].title,'A');
});
