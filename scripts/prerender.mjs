import { readFile, writeFile } from 'node:fs/promises';
import { render } from '../.ssr/entry-server.js';

const file = new URL('../dist/index.html', import.meta.url);
const template = await readFile(file, 'utf8');
if (!template.includes('<!--app-html-->')) throw new Error('Marcador de pré-renderização ausente.');
await writeFile(file, template.replace('<!--app-html-->', render()));
console.log('Vitrine pré-renderizada: conteúdo e links presentes no HTML inicial.');
