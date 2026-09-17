// Grille tarifaire par paliers de clients franchiseurs suivis — source unique
// utilisée à la fois par la landing page (contenu marketing) et l'espace
// avocat (indicateur de palier actuel), pour qu'elles ne divergent jamais.
// Le prix d'installation est fixe, indépendant du palier.
export const SETUP_FEE = 1300;

export const PRICING_TIERS = [
  { min: 1, max: 5, price: 850, label: '1 à 5 clients' },
  { min: 6, max: 15, price: 1450, label: '6 à 15 clients' },
  { min: 16, max: 30, price: 2200, label: '16 à 30 clients' },
  { min: 31, max: Infinity, price: null, label: '31 clients et plus', onDevis: true },
];

export function getTierForCount(count) {
  return PRICING_TIERS.find(t => count <= t.max) || PRICING_TIERS[PRICING_TIERS.length - 1];
}

export function getNextTier(count) {
  const currentIndex = PRICING_TIERS.findIndex(t => count <= t.max);
  return currentIndex >= 0 ? PRICING_TIERS[currentIndex + 1] : null;
}
