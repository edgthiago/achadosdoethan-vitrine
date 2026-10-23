import catalog from './data/products.json';
import cascataLed from './data/cascataLed.js';
import v10Bluetooth from './data/v10Bluetooth.js';

if (!catalog.some(product => product.id === cascataLed.id)) catalog.unshift(cascataLed);
if (!catalog.some(product => product.id === v10Bluetooth.id)) catalog.unshift(v10Bluetooth);

export const instagramPickIds = [
  'bluetooth-v10-capacete',
  'cascata-led-400-10m',
  'kit-fitness-camiseta-feminino',
  'kit-leggings',
];
