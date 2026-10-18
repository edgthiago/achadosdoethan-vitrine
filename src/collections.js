export const collections = [
 {id:'looks-de-academia',title:'Looks de academia',subtitle:'Leggings, tênis e peças para combinar',cover:'kit-leggings',ids:['kit-leggings','kit-fitness-camiseta-feminino','conjunto-legging-top-canelado','conjunto-fitness-virginia','tenis-olympikus-easy-2','tenis-sneeks-feminino','tenis-masculino-olimpic','tenis-academia-masculino-gigi','tenis-unissex-eva-mesh','kit-camisas-uv-manga-longa','tenis-kappa-park-20','kit-jogger-impulse-2','kit-camisetas-dryfit-5','tenis-kappa-pulse-rx','tenis-kappa-zenit']},
 {id:'casa-pratica',title:'Casa prática',subtitle:'Ideias para facilitar a rotina',cover:'cortador-legumes-16-pecas',ids:['bolsa-termica-mao-lancheira','copo-termico-12l-canudo','garrafa-termica-500ml-3-xicaras','porta-mantimentos-5-pecas','cortador-legumes-16-pecas','bomba-eletrica-galao','kit-potes-tempero-bambu','torneira-camperluz','balanca-hardline-10kg','liquidificador-mondial-l99']},
 {id:'beleza-e-cuidados',title:'Beleza e cuidados',subtitle:'Cabelo e momentos de autocuidado',cover:'gelatina-salon-line-nova',ids:['barbeador-kemei-3-em-1','gelatina-salon-line-nova','kit-sos-salon-line','massageador-pescoco-ombros-deep3d']}
];
export function isRecent(product, now = Date.now()) {
 if (!product.addedAt) return false;
 const age = now - Date.parse(product.addedAt);
 return age >= 0 && age < 7 * 86400000;
}
export function readFavorites(raw, products) {
 try { const ids=JSON.parse(raw); return Array.isArray(ids) ? [...new Set(ids.filter(id=>products.some(p=>p.id===id)))] : []; } catch { return []; }
}
