# Achados do Ethan — React + Vite

Vitrine de afiliados em React, publicada como arquivos estáticos no Worker existente `achadosdoethan-vitrine` e no domínio `achadosdoethan.com.br`.

## Desenvolvimento

Requer Node.js 22.12 ou superior.

```sh
npm ci
npm run dev
```

- `src/data/products.json`: catálogo, imagens, preços informados e links de afiliado.
- `src/App.jsx`: componentes da vitrine, destaque, produtos e cupom.
- `src/catalog.js`: busca, filtros, URLs e compartilhamento.
- `src/styles.css`: identidade visual e enquadramento do destaque.
- `public/assets/`: imagens existentes, preservadas na migração.
- `index.html`: metadados do site e da prévia de compartilhamento.

## Verificar e publicar

```sh
npm run build
npm test
npm run deploy
```

O build gera `dist/` e pré-renderiza o catálogo no HTML. O React hidrata a página no navegador; não há necessidade de servidor de renderização ou banco de dados.

O `wrangler.json` mantém o nome do Worker e o endereço workers.dev. Seu comando de build é executado automaticamente por `wrangler deploy`, portanto a integração existente pode continuar usando `npx wrangler deploy`. Não incluir tokens no repositório.

Para envio manual pelo painel da Cloudflare, envie **todo o conteúdo de `dist/`**, incluindo `index.html`, `favicon.svg` e `assets/`. Não envie a pasta de código-fonte nem somente o HTML. Confirme o domínio público após a implantação.

Os preços e condições permanecem associados às datas originais de consulta. Atualize-os somente após conferir o anúncio e preserve os links de afiliado. O destaque é definido por `featuredProductId` em `src/catalog.js`; o produto também deve aparecer no início do catálogo.
