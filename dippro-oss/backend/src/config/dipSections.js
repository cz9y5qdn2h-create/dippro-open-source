// Les 10 sections pratiques du DIP et leur base légale exacte — extrait de
// claude.js pour être réutilisable ailleurs (ex. le récapitulatif automatisé
// envoyé à l'avocat) sans dupliquer la table et risquer une divergence.
//
// Chaque section pratique ne correspond pas à un point R.330-1 du même
// numéro — table vérifiée contre le texte en vigueur au 01/01/2024, décret
// n°2023-1394 du 30/12/2023 :
// 1→1°+2°+3°, 2→4° al.1-2, 3→5° a-d, 4→4° al.3, 5→2°, 6→dernier alinéa,
// 7→6° (champ des exclusivités), 8→6° (durée/renouvellement/résiliation/
// cession), 9→hors R.330-1 (art. 1112-1 C.civ.), 10→hors R.330-1 (jurisprudence).

const SECTIONS_DEFAULT = [
  'Identité du franchiseur',
  'Historique de l\'enseigne et du dirigeant',
  'État du réseau de franchisés',
  'Comptes annuels',
  'Marque et propriété intellectuelle',
  'Informations financières',
  'Territoire exclusif',
  'Contrat (durée, renouvellement, résiliation)',
  'Litiges en cours et passés',
  'Comptes prévisionnels'
];

const LEGAL_REFS = [
  'Art. R.330-1, 1° + 2° + 3° C. com.',
  'Art. R.330-1, 4° al. 1-2 C. com.',
  'Art. R.330-1, 5° a) à d) C. com.',
  'Art. R.330-1, 4° al. 3 C. com.',
  'Art. R.330-1, 2° C. com.',
  'Art. R.330-1, dernier alinéa C. com.',
  'Art. R.330-1, 6° C. com. (champ des exclusivités)',
  'Art. R.330-1, 6° C. com. (durée, renouvellement, résiliation, cession)',
  'Art. 1112-1 Code civil (hors périmètre R.330-1)',
  'Jurisprudence — Cass. com. 1er déc. 2021 et 1er juin 2022 (hors périmètre R.330-1)'
];

module.exports = { SECTIONS_DEFAULT, LEGAL_REFS };
