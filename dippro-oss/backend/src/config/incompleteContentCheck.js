// Détecte les marqueurs que l'IA insère elle-même dans une section/clause
// quand une donnée manquante l'empêche de rédiger un texte complet (voir
// claude.js : "[À COMPLÉTER : ...]" dans les corrections guidées par
// questions, "Non renseigné — à compléter avant remise" dans la génération
// depuis formulaire). Jusqu'ici rien ne surveillait leur présence une fois
// le contenu enregistré — un franchiseur pouvait sauvegarder une section
// avec un placeholder resté en l'état, sans jamais en être alerté.
const INCOMPLETE_MARKERS = [
  // Crochets obligatoires : sans eux, ça matcherait n'importe quelle phrase
  // légitime contenant "à compléter" (ex: "clause à compléter par avenant").
  /\[À COMPLÉTER[^\]]*\]/i,
  /Non renseigné\s*—\s*à compléter avant remise/i,
];

function findIncompleteMarker(content) {
  if (!content) return null;
  for (const re of INCOMPLETE_MARKERS) {
    const m = content.match(re);
    if (m) return m[0];
  }
  return null;
}

// Construit les lignes d'alerte pour un lot de sections/clauses fraîchement
// insérées (génération IA depuis formulaire) — jusqu'ici seule l'édition
// manuelle d'une section/clause déclenchait cette vérification ; un DIP ou
// contrat entièrement généré par l'IA pouvait contenir des "[À COMPLÉTER]"
// dès sa création sans que rien ne le signale avant la remise.
function buildIncompleteAlerts(items, { parentKey, parentId, itemKey, titleField, docLabel }) {
  const alerts = [];
  for (const item of items) {
    const marker = findIncompleteMarker(item.content);
    if (!marker) continue;
    alerts.push({
      [parentKey]: parentId,
      [itemKey]: item.id,
      source: 'Contenu à compléter',
      suggestion: `${docLabel} « ${item[titleField]} » contient un passage non finalisé : « ${marker} ». Complétez-le avant la remise.`,
      urgency: 'haute',
      status: 'pending',
    });
  }
  return alerts;
}

module.exports = { findIncompleteMarker, buildIncompleteAlerts };
