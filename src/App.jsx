import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import products from './data/products.json';
import { categories, featuredProductId, matchesProduct, readCatalogLocation, catalogUrl, shareProduct, productUrl, selectProducts } from './catalog.js';

const instagram = 'https://www.instagram.com/achadosdoethan/';
const featured = products.find(product => product.id === featuredProductId);
const coupon = 'POUPAMAIS';

function Brand() {
  return <a className="brand" href="/" aria-label="Achados do Ethan, página inicial">
    <span className="mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M15 19v-5a9 9 0 0 1 18 0v5" fill="none" stroke="#ffda55" strokeWidth="3.5" strokeLinecap="round"/><path d="M9 18h30l-2 23H11L9 18Z" fill="#ffda55"/><text x="24" y="35" textAnchor="middle" fill="#101e38" fontFamily="Arial,sans-serif" fontSize="21" fontWeight="800">e</text></svg></span>
    Achados do Ethan
  </a>;
}

function Hero({ onShowProduct }) {
  return <>
    <section className="hero hero-home">
      <div className="hero-copy">
        <p className="eyebrow">🛍️ CASA · MODA · TECNOLOGIA · BELEZA</p>
        <h1>Achados com informação.<br/><em>Compra com atenção.</em></h1>
        <p>Viu um produto no Instagram? Encontre aqui os detalhes e acesse o anúncio para conferir preço, frete e disponibilidade atualizados.</p>
        <a className="hero-cta" href="#produtos">Explorar a vitrine ↓</a>
      </div>
      <a className="hero-visual hero-leggings" href={`#${featured.id}`} onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onShowProduct(featured.id);
      }} aria-label="Ver o kit com 3 leggings femininas em destaque">
        <img src={featured.image.src} alt="Kit com 3 leggings femininas em destaque na vitrine" fetchPriority="high" width="800" height="800"/>
        <span className="hero-feature-tag">DESTAQUE DA VITRINE</span>
        <span className="hero-feature-title">{featured.title}<span>Ver detalhes ↗</span></span>
      </a>
    </section>
    <div className="trust-strip" aria-label="Como usar a vitrine">
      <div><strong>Encontre o achado</strong><span>Procure pelo produto que viu no Instagram.</span></div>
      <div><strong>Confira os detalhes</strong><span>Veja medidas, vendedor, frete e condições.</span></div>
      <div><strong>Confirme no anúncio</strong><span>Preço e disponibilidade podem mudar.</span></div>
    </div>
  </>;
}

function Coupon({ notify }) {
  async function copyCoupon() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(coupon);
      notify(`Cupom ${coupon} copiado!`);
    } catch {
      window.prompt('Copie o cupom:', coupon);
    }
  }
  return <section className="coupon-card" aria-labelledby="coupon-title">
    <div className="coupon-copy">
      <span className="coupon-label">Cupom da comunidade</span>
      <h2 id="coupon-title">25% OFF em produtos participantes</h2>
      <p>Para compras pelo nosso link de afiliado. Confira a aplicação no carrinho.</p>
      <details className="coupon-terms"><summary>Ver condições do cupom</summary><p>Compra mínima de R$ 1. Desconto máximo de R$ 500. Oferta válida enquanto durarem os estoques, conforme disponibilidade da campanha. O cupom não se aplica necessariamente a todos os produtos desta vitrine.</p></details>
    </div>
    <div className="coupon-action"><span className="coupon-code">{coupon}</span><button type="button" id="copy-coupon" aria-label={`Copiar o cupom ${coupon}`} onClick={copyCoupon}>Copiar cupom</button></div>
  </section>;
}

function ProductCard({ product, notify }) {
  async function share() {
    try {
      const result = await shareProduct(product, window.location.href, navigator);
      if (result === 'copied') notify('Link do produto copiado!');
      else if (result !== 'shared') window.prompt('Copie o link deste produto:', result);
    } catch (error) {
      if (error.name !== 'AbortError') notify('Não foi possível compartilhar. Tente novamente.');
    }
  }
  return <article id={product.id} className={`card${product.isNew ? ' new-card' : ''}`} data-category={product.category} data-new={product.isNew ? 'true' : undefined} data-search={product.search}>
    <div className={product.visualClass}>
      <img src={product.image.src} alt={product.image.alt} width={product.image.width} height={product.image.height} loading="lazy" decoding="async"/>
      <span className="tag">{product.badge}</span>
    </div>
    <div className="copy">
      <p className="card-category">{product.category}</p>
      <h3><a className="product-title-link" href={productUrl("https://achadosdoethan.com.br/", product.id)}>{product.title}</a></h3>
      <div className="price-row"><strong>{product.price}</strong>{product.priceLabel && product.priceLabel !== 'Anúncio consultado' && <span>{product.priceLabel}</span>}</div>
      <p className="price-note">{product.priceNote}</p>
      <details className="card-info">
        <summary>Detalhes e cuidados antes de comprar</summary>
        <p>{product.description}</p>
        <p className="tip">{product.tip}</p>
        {product.details && <p><strong>{product.details.summary}:</strong> {product.details.text}</p>}
      </details>
      <div className="card-actions">
        <a className="cta" href={product.url} target="_blank" rel="sponsored noopener noreferrer" aria-label={`Ver ${product.title} no Mercado Livre`}>Ver no Mercado Livre <span aria-hidden="true">↗</span></a>
        <button type="button" className="share-product" aria-label={`Compartilhar ${product.title}`} onClick={share}>Compartilhar produto <span aria-hidden="true">↗</span></button>
        <span className="micro">{product.disclosure}</span>
      </div>
    </div>
  </article>;
}

function ShoppingGuide() {
  return <>
    <section className="how"><h2>Do achado à compra</h2><ol>
      <li>Encontre o produto que você viu no perfil.</li>
      <li>Abra o anúncio e confira preço final, características, vendedor, cupom e frete para seu CEP.</li>
      <li>Antes de confirmar a compra, confira novamente o total e a variação selecionada: preço, cupom e disponibilidade podem mudar.</li>
    </ol></section>
    <section className="faq"><h2>Antes de escolher</h2>
      <details><summary>O que são links de afiliado?</summary><p>Podemos receber uma comissão por compras qualificadas feitas pelos links desta página.</p></details>
      <details><summary>Os preços podem mudar?</summary><p>Sim. Os valores exibidos foram consultados nas datas indicadas e podem mudar. Antes de confirmar a compra, confira no anúncio o preço final, o frete para seu CEP, o cupom e a variação selecionada.</p></details>
      <details><summary>O Achados do Ethan vende os produtos?</summary><p>Divulgamos achados. Pagamento, entrega, devoluções e atendimento da compra são realizados pela plataforma e pelo vendedor.</p></details>
    </section>
  </>;
}

export default function App({ initialProductId = null }) {
  const [category, setCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [order, setOrder] = useState('featured');
  const [locationReady, setLocationReady] = useState(false);
  const [toast, setToast] = useState('');
  const searchRef = useRef(null);
  const timerRef = useRef(null);
  const frameRef = useRef(null);

  const scrollToProduct = useCallback(id => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, []);

  const showProduct = useCallback(id => {
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.delete('categoria');
    url.hash = id;
    window.history.pushState(null, '', url);
    setCategory('Todos');
    setQuery('');
    setPriceRange('all');
    scrollToProduct(id);
  }, [scrollToProduct]);

  useEffect(() => {
    function restoreLocation() {
      const current = readCatalogLocation(window.location.href, products);
      setCategory(current.category);
      setQuery(current.query);
      if (current.productId) scrollToProduct(current.productId);
      setLocationReady(true);
    }
    restoreLocation();
    window.addEventListener('hashchange', restoreLocation);
    window.addEventListener('popstate', restoreLocation);
    return () => {
      window.removeEventListener('hashchange', restoreLocation);
      window.removeEventListener('popstate', restoreLocation);
      cancelAnimationFrame(frameRef.current);
      clearTimeout(timerRef.current);
    };
  }, [scrollToProduct]);

  useEffect(() => {
    if (locationReady && !initialProductId) window.history.replaceState(null, '', catalogUrl(window.location.href, category, query));
  }, [category, query, locationReady]);

  function notify(message) {
    setToast(message);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(''), 3500);
  }

  function reset() {
    setCategory('Todos');
    setQuery('');
    setPriceRange('all');
    setOrder('featured');
    searchRef.current?.focus();
  }

  const visibleProducts = useMemo(() => selectProducts(products, category, query, priceRange, order), [category, query, priceRange, order]);
  const counts = useMemo(() => Object.fromEntries(categories.map(value => [value, products.filter(product => matchesProduct(product, value)).length])), []);
  const resultText = query.trim() ? `Resultados para “${query.trim()}”` : category === 'Todos' ? 'Todos os achados' : category === 'Novos' ? 'Adicionados recentemente' : `Categoria: ${category}`;

  const selectedProduct = products.find(p => p.id === initialProductId);
  if (selectedProduct) return <div className="wrap">
    <header><Brand/><a className="insta" href="/#produtos">Ver toda a vitrine ↗</a></header>
    <main className="product-page"><a href="/#produtos" className="back-link">← Voltar à vitrine</a>
      <p className="eyebrow">ACHADOS DO ETHAN · {selectedProduct.category}</p>
      <h1>{selectedProduct.title}</h1>
      <div className="grid product-detail"><ProductCard product={selectedProduct} notify={notify}/></div>
      <ShoppingGuide/>
    </main><p className="toast" role="status" hidden={!toast}>{toast}</p>
  </div>;
  return <>
    <a className="skip-link" href="#conteudo">Ir para os produtos</a>
    <div className="wrap">
      <header><Brand/><a className="insta" href={instagram} target="_blank" rel="noopener noreferrer">Ver Instagram ↗</a></header>
      <main id="conteudo">
        <Hero onShowProduct={showProduct}/>
        <section className="instagram-picks" aria-labelledby="instagram-title">
          <div><p className="eyebrow">DO PERFIL PARA A VITRINE</p><h2 id="instagram-title">Viu no Instagram?</h2><p>Atalhos para os achados divulgados no perfil.</p></div>
          <div className="instagram-list">{['kit-leggings', 'jeans', 'medidor-pressao'].map(id => products.find(p => p.id === id)).filter(Boolean).map(p => <a key={p.id} href={productUrl('https://achadosdoethan.com.br/', p.id)}><img src={p.image.src} alt={p.image.alt} width="100" height="100" loading="lazy" decoding="async"/><span><strong>{p.title}</strong><small>Ver detalhes ↗</small></span></a>)}</div>
        </section>
        <section id="produtos" aria-labelledby="products-title">
          <p className="affiliate-note">Links de afiliado: podemos receber comissão por compras qualificadas.</p>
          <Coupon notify={notify}/>
          <div className="intro-row"><div><h2 id="products-title">Escolha seu achado</h2><p>Preços vistos nas datas indicadas; confira o valor atualizado no anúncio antes de comprar.</p></div><span className="count" id="count" aria-live="polite">{visibleProducts.length} {visibleProducts.length === 1 ? 'produto' : 'produtos'}</span></div>
          <label className="search-label" htmlFor="search">Buscar produto</label>
          <input ref={searchRef} id="search" className="search" type="search" placeholder="Leggings, conjunto fitness, tênis, jeans, mouse…" value={query} onChange={event => setQuery(event.target.value)}/>
          <div className="filters" aria-label="Filtrar por categoria">{categories.map(value => <button key={value} type="button" data-filter={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value} ({counts[value]})</button>)}</div>
          <div className="catalog-selects">
            <label>Faixa de preço<select value={priceRange} onChange={e => setPriceRange(e.target.value)}><option value="all">Todos os preços</option><option value="under50">Menos de R$ 50</option><option value="from50to100">R$ 50 a menos de R$ 100</option><option value="from100to300">R$ 100 a menos de R$ 300</option><option value="over300">R$ 300 ou mais</option></select></label>
            <label>Ordenar por<select value={order} onChange={e => setOrder(e.target.value)}><option value="featured">Destaques da vitrine</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label>
          </div>
          <div className="catalog-toolbar"><p id="result-text" aria-live="polite">{resultText}</p><button type="button" id="reset" hidden={category === 'Todos' && !query.trim() && priceRange === 'all' && order === 'featured'} onClick={reset}>Limpar filtros</button></div>
          <div className="grid">{visibleProducts.map(product => <ProductCard key={product.id} product={product} notify={notify}/>)}</div>
          {visibleProducts.length === 0 && <div className="empty" id="empty" role="status"><strong>Nenhum achado encontrado</strong><p>Tente outro nome ou volte para todos os produtos.</p><button type="button" id="empty-reset" onClick={reset}>Ver todos os achados</button></div>}
        </section>
        <ShoppingGuide/>
      </main>
      <footer><div className="footrow"><strong>Achados do Ethan</strong><a href={instagram} target="_blank" rel="noopener noreferrer">@achadosdoethan ↗</a></div><p>Transparência: esta página contém links de afiliado. Não somos uma loja oficial do Mercado Livre. Consulte todas as condições no anúncio antes de comprar.</p><span>© 2026 Achados do Ethan</span></footer>
    </div>
    <p className="toast" id="toast" role="status" hidden={!toast}>{toast}</p>
  </>;
}
