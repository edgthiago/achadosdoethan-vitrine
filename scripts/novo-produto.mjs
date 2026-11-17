// Cadastra um produto novo no começo do catálogo (src/data/products.json).
// Exemplo:
//   npm run novo-produto -- --url https://meli.la/abc123 --titulo "Fritadeira 4L" \
//     --preco 189,90 --categoria Casa --imagem https://http2.mlstatic.com/foto.webp --desconto "25% OFF"
// Use --simular para ver o resultado sem gravar.
import { readFile, writeFile, access } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { buildProduct, addToCatalog, serializeCatalog } from './lib/catalogo.mjs';

const file = new URL('../src/data/products.json', import.meta.url);
const { values } = parseArgs({
  options: {
    url: { type: 'string' }, titulo: { type: 'string' }, preco: { type: 'string' }, categoria: { type: 'string' },
    imagem: { type: 'string' }, loja: { type: 'string' }, desconto: { type: 'string' }, selo: { type: 'string' },
    descricao: { type: 'string' }, dica: { type: 'string' }, palavras: { type: 'string' }, id: { type: 'string' },
    'preco-antigo': { type: 'string' }, largura: { type: 'string' }, altura: { type: 'string' }, simular: { type: 'boolean', default: false }
  }
});

try {
  const products = JSON.parse(await readFile(file, 'utf8'));
  if (values.imagem?.startsWith('/')) {
    await access(new URL(`../public${values.imagem}`, import.meta.url)).catch(() => { throw new Error(`Arquivo não encontrado em public${values.imagem}.`); });
  }
  const product = buildProduct({ ...values, precoAntigo: values['preco-antigo'] }, products);
  if (values.simular) {
    console.log(JSON.stringify(product, null, 2));
    console.log('\n(simulação: nada foi gravado)');
  } else {
    await writeFile(file, serializeCatalog(addToCatalog(products, product)));
    console.log(`Produto "${product.title}" adicionado em src/data/products.json (id: ${product.id}).`);
    console.log('Revise o texto de descrição e dica, depois rode: npm run build && npm test');
  }
} catch (error) {
  console.error(`Erro: ${error.message}`);
  process.exit(1);
}
