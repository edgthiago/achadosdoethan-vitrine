// Relatório de saúde do catálogo: preços antigos e links com problema.
import { priceCheckedAt } from '../../src/catalog.js';

export function stalePrices(products, now = Date.now(), days = 30) {
  return products
    .map(product => ({ product, checked: priceCheckedAt(product) }))
    .filter(({ checked }) => checked !== null && now - checked >= days * 86400000)
    .map(({ product, checked }) => ({ product, checked, ageDays: Math.floor((now - checked) / 86400000) }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function collectLinks(products) {
  const links = new Map();
  const add = (url, id, kind) => { if (!links.has(url)) links.set(url, []); links.get(url).push({ id, kind }); };
  for (const p of products) {
    add(p.url, p.id, 'principal');
    if (p.otherOffer?.url) add(p.otherOffer.url, p.id, 'comparação');
  }
  return links;
}

// "gone": o endereço não existe mais. "error": rede/tempo esgotado. "blocked": a loja recusou o robô,
// o que não diz nada sobre o anúncio. "ok": respondeu normalmente.
export function classify(status) {
  if (status >= 200 && status < 400) return 'ok';
  if (status === 404 || status === 410) return 'gone';
  return 'blocked';
}

export async function checkLinks(urls, { fetchImpl = fetch, concurrency = 5, timeoutMs = 15000, retries = 1 } = {}) {
  const queue = [...urls];
  const results = new Map();
  async function check(url) {
    let last = 'error';
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'Mozilla/5.0 (compatible; achados-saude-catalogo)' } });
        const kind = classify(response.status);
        results.set(url, { kind, status: response.status });
        return;
      } catch (error) { last = error.name === 'TimeoutError' ? 'tempo esgotado' : (error.cause?.code || error.message); }
    }
    results.set(url, { kind: 'error', detail: last });
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) await check(queue.shift());
  }));
  return results;
}

const date = ts => new Date(ts).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export function buildReport({ products, now = Date.now(), days = 30, linkResults = null, links = collectLinks(products) }) {
  const stale = stalePrices(products, now, days);
  const broken = linkResults ? [...links].filter(([url]) => ['gone', 'error'].includes(linkResults.get(url)?.kind)) : [];
  const blocked = linkResults ? [...links].filter(([url]) => linkResults.get(url)?.kind === 'blocked').length : 0;
  const undated = products.filter(p => priceCheckedAt(p) === null);
  const problems = stale.length + broken.length + undated.length;
  const lines = [`# Saúde do catálogo`, '', `Gerado em ${date(now)}. ${products.length} produtos.`, ''];

  lines.push(`## Links com problema (${linkResults ? broken.length : 'não verificados'})`, '');
  if (!linkResults) lines.push('Verificação de links desativada nesta execução.');
  else if (!broken.length) lines.push('Nenhum link com problema encontrado.');
  else for (const [url, uses] of broken) {
    const r = linkResults.get(url);
    lines.push(`- ${uses.map(u => `\`${u.id}\` (${u.kind})`).join(', ')}: ${url} — ${r.kind === 'gone' ? `não encontrado (HTTP ${r.status})` : `sem resposta (${r.detail})`}`);
  }
  if (blocked) lines.push('', `${blocked} link(s) recusaram a checagem automática (a loja bloqueia robôs). Isso não indica problema no anúncio e não entra na contagem.`);

  lines.push('', `## Preços consultados há ${days}+ dias (${stale.length})`, '');
  if (!stale.length) lines.push('Nenhum preço antigo.');
  else {
    lines.push('Confira no anúncio, atualize preço e data em `src/data/products.json` ou remova o produto.', '', '| Consulta | Dias | Preço | Produto | Link |', '|---|---|---|---|---|');
    for (const { product, checked, ageDays } of stale) lines.push(`| ${date(checked)} | ${ageDays} | ${product.price} | \`${product.id}\` | ${product.url} |`);
  }
  if (undated.length) lines.push('', `## Sem data de consulta (${undated.length})`, '', 'O texto `priceNote` precisa ter a data no formato dd/mm/aaaa para o aviso de preço antigo funcionar:', '', ...undated.map(p => `- \`${p.id}\``));
  lines.push('', '---', '_Relatório automático. Atualizado toda segunda-feira por `.github/workflows/saude-catalogo.yml`._');
  return { markdown: lines.join('\n') + '\n', problems, stale: stale.length, broken: broken.length, undated: undated.length };
}
