export const categories = ['Todos', 'Novos', 'Casa', 'Fitness', 'Tecnologia', 'Moda', 'Beleza', 'Pets'];
export const featuredProductId = 'kit-leggings';
export const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function matchesProduct(product, category = 'Todos', query = '') {
  const matchesCategory = category === 'Todos' || (category === 'Novos' ? product.isNew : product.category === category);
  const haystack = normalize(`${product.title} ${product.search}`);
  return matchesCategory && normalize(query.trim()).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}

export function readCatalogLocation(href, products) {
  const url = new URL(href);
  const productId = url.hash.slice(1);
  if (products.some(product => product.id === productId)) {
    return { category: 'Todos', query: '', productId };
  }
  const category = url.searchParams.get('categoria');
  return { category: categories.includes(category) ? category : 'Todos', query: url.searchParams.get('q') || '', productId: null };
}

export function catalogUrl(href, category, query) {
  const url = new URL(href);
  category === 'Todos' ? url.searchParams.delete('categoria') : url.searchParams.set('categoria', category);
  query.trim() ? url.searchParams.set('q', query.trim()) : url.searchParams.delete('q');
  if (category !== 'Todos' || query.trim()) url.hash = '';
  return url.href;
}

export function productUrl(href, id) {
  const url = new URL(href);
  url.search = '';
  url.hash = id;
  return url.href;
}

export async function shareProduct(product, href, nav) {
  const url = productUrl(href, product.id);
  if (nav.share) {
    await nav.share({ title: `Achados do Ethan · ${product.title}`, text: 'Confira este achado:', url });
    return 'shared';
  }
  if (nav.clipboard?.writeText) {
    await nav.clipboard.writeText(url);
    return 'copied';
  }
  return url;
}
