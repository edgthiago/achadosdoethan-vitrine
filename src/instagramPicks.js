import catalog from './data/products.json';
import cascataLed from './data/cascataLed.js';

if (!catalog.some(product => product.id === cascataLed.id)) catalog.unshift(cascataLed);

export const instagramPickIds = [
  'cascata-led-400-10m',
  'kit-fitness-camiseta-feminino',
  'kit-leggings',
  'jeans',
];
