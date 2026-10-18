import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { render } from '../.ssr/entry-server.js';
const root = new URL('../dist/', import.meta.url);
const template = await readFile(new URL('index.html', root), 'utf8');
const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));
if (!template.includes('<!--app-html-->')) throw new Error('Marcador de pré-renderização ausente.');
await writeFile(new URL('index.html', root), template.replace('<!--app-html-->', render()));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urls = ['https://achadosdoethan.com.br/'];
for (const p of products) {
  const url = `https://achadosdoethan.com.br/produto/${p.id}/`;
  const title = `${p.title} | Achados do Ethan`;
  const description = `${p.description} Confira preço, frete e disponibilidade no anúncio.`;
  let html = template.replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`);
  const metas = {description, 'og:title':title, 'og:description':description, 'og:url':url, 'og:image':p.image.src, 'og:image:secure_url':p.image.src, 'og:image:alt':p.image.alt, 'twitter:title':title, 'twitter:description':description, 'twitter:image':p.image.src};
  for (const [name, value] of Object.entries(metas)) html = html.replace(new RegExp(`<meta (?:name|property)="${name}" content="[^"]*">`), `<meta ${name.includes('og:') ? 'property' : 'name'}="${name}" content="${escape(value)}">`);
  html = html.replace(/<meta property="og:image:(?:width|height|type)" content="[^"]*">/g, '').replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  html = html.replace('<div id="root">', `<div id="root" data-product="${escape(p.id)}">`).replace('<!--app-html-->', render(p.id));
  const dir = new URL(`produto/${p.id}/`, root);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('index.html', dir), html);
  urls.push(url);
}
await writeFile(new URL('sitemap.xml', root), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>`);
console.log(`Vitrine e ${products.length} páginas de produto pré-renderizadas com metadados de compartilhamento.`);
