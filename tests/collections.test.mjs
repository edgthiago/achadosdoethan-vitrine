import test from 'node:test';
import assert from 'node:assert/strict';
import {collections,isRecent,readFavorites} from '../src/collections.js';
import {readFile} from 'node:fs/promises';
const products=JSON.parse(await readFile(new URL('../src/data/products.json',import.meta.url)));
test('coleções apontam para itens reais e sem duplicatas',()=>{
 for(const c of collections){assert.equal(new Set(c.ids).size,c.ids.length);assert.ok(products.some(p=>p.id===c.cover));assert.ok(c.ids.every(id=>products.some(p=>p.id===id)));}
});
test('novidade expira após sete dias e não inventa data ausente',()=>{
 const p={addedAt:'2026-10-18T00:00:00-03:00'};
 assert.equal(isRecent(p,Date.parse('2026-10-24T23:59:59-03:00')),true);
 assert.equal(isRecent(p,Date.parse('2026-10-25T00:00:00-03:00')),false);
 assert.equal(isRecent({},Date.now()),false);
 assert.equal(isRecent(p,Date.parse('2026-10-17')),false);
});
test('favoritos toleram dados inválidos e removem itens inexistentes',()=>{
 assert.deepEqual(readFavorites('invalid',products),[]);
 assert.deepEqual(readFavorites('{"x":1}',products),[]);
 assert.deepEqual(readFavorites('["kit-leggings","missing","kit-leggings"]',products),['kit-leggings']);
});
