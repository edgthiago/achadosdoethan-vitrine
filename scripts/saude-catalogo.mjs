// Gera o relatório de saúde do catálogo (preços antigos e links com problema).
// Uso: npm run saude-catalogo                       -> imprime o relatório
//      npm run saude-catalogo -- --sem-links        -> só preços antigos (rápido, offline)
//      npm run saude-catalogo -- --saida relatorio.md --dias 15
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { stalePriceDays } from '../src/siteConfig.js';
import { buildReport, checkLinks, collectLinks } from './lib/saude.mjs';

const { values } = parseArgs({ options: { 'sem-links': { type: 'boolean', default: false }, saida: { type: 'string' }, dias: { type: 'string' } } });
const days = Number(values.dias) || stalePriceDays;
const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const links = collectLinks(products);
const linkResults = values['sem-links'] ? null : await checkLinks([...links.keys()]);
const report = buildReport({ products, days, linkResults, links });

if (values.saida) await writeFile(values.saida, report.markdown); else process.stdout.write(report.markdown);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `problemas=${report.problems}\n`);
console.error(`${report.problems} item(ns) a revisar: ${report.stale} preço(s) antigo(s), ${report.broken} link(s) com problema, ${report.undated} sem data.`);
