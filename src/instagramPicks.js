import catalog from './data/products.json';
import piscaPiscaZenx from './data/piscaPiscaZenx.js';
import cascataLed from './data/cascataLed.js';
import v10Bluetooth from './data/v10Bluetooth.js';
import galaxyLamp from './data/galaxyLamp.js';
import kappaPark2 from './data/kappaPark2.js';
import christmasTree from './data/christmasTree.js';

if (!catalog.some(product => product.id === piscaPiscaZenx.id)) catalog.unshift(piscaPiscaZenx);
if (!catalog.some(product => product.id === cascataLed.id)) catalog.unshift(cascataLed);
if (!catalog.some(product => product.id === v10Bluetooth.id)) catalog.unshift(v10Bluetooth);
if (!catalog.some(product => product.id === galaxyLamp.id)) catalog.unshift(galaxyLamp);
if (!catalog.some(product => product.id === kappaPark2.id)) catalog.unshift(kappaPark2);
if (!catalog.some(product => product.id === christmasTree.id)) catalog.unshift(christmasTree);

const balanca = catalog.find(product => product.id === 'balanca-bahrein-cozinha');
if (balanca) balanca.badge = 'Oferta';
const alicate = catalog.find(product => product.id === 'alicate-dobravel-descascador-fios');
if (alicate) alicate.badge = 'Achado útil';

export const instagramPickIds = [
  'pisca-pisca-zenx-100-led-9m',
  'arvore-natal-dekasa-150-500',
  'tenis-kappa-park-2',
  'luminaria-galaxy-360',
  'bluetooth-v10-capacete',
  'cascata-led-400-10m',
];
