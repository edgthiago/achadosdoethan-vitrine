// Funções puras para montar produtos novos e inseri-los no catálogo.
import { categories, normalize } from '../../src/catalog.js';

export const stores = {
  'mercado-livre': {
    label: 'Mercado Livre',
    prep: 'no',
    host: 'meli.la',
    cta: 'Conferir no Mercado Livre ↗',
    disclosure: 'Publicidade · Link de afiliado · Confira preço e disponibilidade no anúncio',
    priceLabel: 'Anúncio consultado',
    priceNote: date => `Preço consultado no anúncio em ${date}. Confira variação, preço final, frete e cupom no anúncio; valores podem mudar.`
  },
  shopee: {
    label: 'Shopee',
    prep: 'na',
    host: 's.shopee.com.br',
    cta: 'Ver na Shopee ↗',
    disclosure: 'Publicidade · Link de afiliado Shopee · Confira preço e disponibilidade no anúncio',
    priceLabel: 'Preço consultado',
    priceNote: date => `Preço exibido na área de afiliados da Shopee em ${date}. Confirme a variação, preço final e frete no anúncio; valores e comissão podem mudar.`
  }
};

export function slugify(text, max = 60) {
  const slug = normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf('-'), 1)).replace(/-+$/, '');
}

export function formatPrice(input) {
  let text = String(input).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!/^[\d.,]+$/.test(text)) throw new Error(`Preço inválido: "${input}". Use algo como 59,90.`);
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}$/.test(text)) text = text.replace(/\./g, '');
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Preço inválido: "${input}". Use algo como 59,90.`);
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function brazilDate(now = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
}

export function brazilTimestamp(now = new Date()) {
  return `${now.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T')}-03:00`;
}

export function buildProduct(options, existing = [], now = new Date()) {
  const marketplace = options.loja || 'mercado-livre';
  const store = stores[marketplace];
  if (!store) throw new Error(`Loja inválida: "${marketplace}". Use mercado-livre ou shopee.`);
  const title = String(options.titulo || '').trim();
  if (!title) throw new Error('Informe o nome do produto com --titulo.');
  if (!options.url) throw new Error('Informe o link de afiliado com --url.');
  let host;
  try { host = new URL(options.url).hostname; } catch { throw new Error(`Link inválido: "${options.url}".`); }
  if (host !== store.host) throw new Error(`O link de ${store.label} deve ser do tipo https://${store.host}/... (recebido: ${host}).`);
  if (!categories.includes(options.categoria) || ['Todos', 'Novos'].includes(options.categoria)) {
    throw new Error(`Categoria inválida: "${options.categoria}". Use: ${categories.filter(c => !['Todos', 'Novos'].includes(c)).join(', ')}.`);
  }
  const image = String(options.imagem || '').trim();
  if (!image) throw new Error('Informe a foto com --imagem (endereço https://... ou /assets/arquivo.webp).');
  if (!image.startsWith('/') && new URL(image).protocol !== 'https:') throw new Error('A imagem deve usar https:// ou ficar em /assets/.');

  const id = options.id || slugify(`${title}${marketplace === 'shopee' ? ' shopee' : ''}`);
  if (existing.some(p => p.id === id)) throw new Error(`Já existe um produto com o ID "${id}". Use --id para escolher outro.`);
  if (existing.some(p => p.url === options.url)) throw new Error('Esse link de afiliado já está no catálogo.');

  const date = brazilDate(now);
  const price = formatPrice(options.preco);
  const product = {
    id,
    category: options.categoria,
    ...(marketplace === 'shopee' ? { marketplace } : {}),
    search: normalize(`${title} ${options.categoria} ${store.label} ${options.palavras || ''}`).replace(/\s+/g, ' ').trim(),
    title,
    image: {
      src: image,
      alt: `${title}, imagem do anúncio ${store.prep} ${store.label}`,
      width: Number(options.largura) || 800,
      height: Number(options.altura) || 800
    },
    visualClass: 'visual',
    badge: options.selo || (marketplace === 'shopee' ? 'Shopee' : 'Oferta'),
    price,
    priceLabel: options.desconto || store.priceLabel,
    priceNote: store.priceNote(date),
    description: options.descricao || `${title}. Produto selecionado ${store.prep} ${store.label}; confira no anúncio as variações disponíveis.`,
    tip: options.dica || 'Confira avaliações, descrição, opções, frete e prazo antes de comprar.',
    url: options.url,
    cta: store.cta,
    disclosure: store.disclosure,
    addedAt: brazilTimestamp(now)
  };
  return product;
}

export function addToCatalog(products, product) {
  return [product, ...products];
}

export const serializeCatalog = products => JSON.stringify(products, null, 2) + '\n';
