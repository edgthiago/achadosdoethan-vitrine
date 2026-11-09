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
  // Reels de produto confirmados no Metricool, do mais recente para o mais antigo.
  'tapioqueira-polvilhador-panylup',
  'kit-infantil-verao-10-pecas-reel',
  'toalha-mesa-6-lugares-joaninhas',
  'cortina-led-luvinco-300-usb',
  'cascata-led-400-10m',
  'kit-10-gorros-natal-dl',
  'escova-eletrica-deckcasa-jy6010',
  'kit-arvore-natal-120cm-enfeites',
  'pisca-pisca-zenx-100-led-9m',
  'tenis-kappa-park-2',
  'luminaria-galaxy-360',
  'bluetooth-v10-capacete',
  // Itens sem Reel de produto datado nas consultas recentes.
  'arvore-natal-dekasa-150-500',
  'arvore-natal-nevada-120cm',
];
