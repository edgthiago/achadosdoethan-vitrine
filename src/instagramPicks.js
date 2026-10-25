import catalog from './data/products.json';
import cascataLed from './data/cascataLed.js';
import v10Bluetooth from './data/v10Bluetooth.js';
import galaxyLamp from './data/galaxyLamp.js';
import kappaPark2 from './data/kappaPark2.js';

if (!catalog.some(product => product.id === cascataLed.id)) catalog.unshift(cascataLed);
if (!catalog.some(product => product.id === v10Bluetooth.id)) catalog.unshift(v10Bluetooth);
if (!catalog.some(product => product.id === galaxyLamp.id)) catalog.unshift(galaxyLamp);
if (!catalog.some(product => product.id === kappaPark2.id)) catalog.unshift(kappaPark2);

export const instagramPickIds = [
  'balanca-bahrein-cozinha',
  'alicate-dobravel-descascador-fios',
  'tenis-kappa-park-2',
  'luminaria-galaxy-360',
  'bluetooth-v10-capacete',
  'cascata-led-400-10m',
];
