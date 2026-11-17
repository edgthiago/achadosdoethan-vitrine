# Achados do Ethan — React + Vite

Vitrine de afiliados em React, publicada como arquivos estáticos no Worker existente `achadosdoethan-vitrine` e no domínio `achadosdoethan.com.br`.

## Desenvolvimento

Requer Node.js 22.12 ou superior.

```sh
npm ci
npm run dev
```

- `src/data/products.json`: fonte única do catálogo (imagens, preços informados, selos e links de afiliado). Novos produtos entram somente aqui.
- `src/siteConfig.js`: cupom (código, textos e data em que some da página), link do Instagram e limite de dias para o aviso de preço antigo.
- `src/instagramPicks.js`: ordem dos achados vistos nos Reels (IDs de `products.json`).
- `src/App.jsx`: componentes da vitrine, destaque, produtos e cupom.
- `src/catalog.js`: busca, filtros, URLs e compartilhamento.
- `src/styles.css`: identidade visual e enquadramento do destaque.
- `public/assets/`: imagens existentes, preservadas na migração.
- `index.html`: metadados do site e da prévia de compartilhamento.

## Rotina de trabalho (automatizada)

Cadastrar um produto novo, sem editar JSON à mão:

```sh
npm run novo-produto -- --url https://meli.la/abc123 --titulo "Fritadeira elétrica 4 L" \
  --preco 189,90 --categoria Casa --imagem https://http2.mlstatic.com/foto.webp --desconto "25% OFF"
```

Para a Shopee, acrescente `--loja shopee` (o link deve ser `https://s.shopee.com.br/...`). O comando monta ID, busca, textos padrão, data da consulta e `addedAt`, recusa link da loja errada, categoria inexistente, ID ou link repetido e imagem local que não exista, e coloca o produto no início do catálogo. Use `--simular` para só visualizar. Com `--preco-antigo 249,90` o card mostra o preço antigo riscado. O percentual de `--desconto` (ex.: "25% OFF") vira o selo amarelo na foto. Outras opções: `--selo`, `--descricao`, `--dica`, `--palavras`, `--id`, `--largura`, `--altura`. Revise a descrição gerada antes de publicar.

Toda segunda-feira, às 08:17 (Brasília), o workflow `Saúde do catálogo` abre ou atualiza uma issue com os preços consultados há mais de 30 dias, os produtos sem data e os links de afiliado que deixaram de existir (404/410 ou sem resposta). Respostas 403/429 das lojas não contam como problema, porque elas bloqueiam robôs. Quando não há nada a revisar, a issue é fechada sozinha. Também pode ser rodado na hora, em Actions → Saúde do catálogo → Run workflow, ou no terminal:

```sh
npm run saude-catalogo                  # relatório completo
npm run saude-catalogo -- --sem-links   # só preços, sem acessar as lojas
```

Limite conhecido: a checagem vê se o endereço responde, não se o anúncio foi pausado ou ficou sem estoque; para isso continue conferindo o preço no anúncio.

## Preços antigos

Cards com preço consultado há mais de 30 dias mostram o aviso "Preço de dd/mm, pode ter mudado". Para listar os produtos a reconferir, do mais antigo para o mais novo:

```sh
npm run precos-antigos
npm run precos-antigos -- 15   # outro limite, em dias
```

A data é lida do texto `priceNote` (formato dd/mm/aaaa); ao atualizar um preço, atualize também essa data.

## Verificar e publicar

```sh
npm run build
npm test
npm run deploy
```

O build gera `dist/` e pré-renderiza o catálogo no HTML. Cada página `/produto/<id>/` recebe metadados de compartilhamento e dados estruturados `Product` (JSON-LD) para o Google; `robots.txt` aponta para o `sitemap.xml` gerado. Endereços inexistentes recebem `404.html` ("Esse achado saiu da vitrine"), e `manifest.webmanifest` permite adicionar a vitrine à tela inicial do celular. O React hidrata a página no navegador; não há necessidade de servidor de renderização ou banco de dados.

O `wrangler.json` mantém o nome do Worker e o endereço workers.dev. Seu comando de build é executado automaticamente por `wrangler deploy`, portanto a integração existente pode continuar usando `npx wrangler deploy`. Não incluir tokens no repositório.

Para envio manual pelo painel da Cloudflare, envie **todo o conteúdo de `dist/`**, incluindo `index.html`, `favicon.svg` e `assets/`. Não envie a pasta de código-fonte nem somente o HTML. Confirme o domínio público após a implantação.

Os preços e condições permanecem associados às datas originais de consulta. Atualize-os somente após conferir o anúncio e preserve os links de afiliado. O destaque é definido por `featuredProductId` em `src/catalog.js`; o produto também deve aparecer no início do catálogo.
