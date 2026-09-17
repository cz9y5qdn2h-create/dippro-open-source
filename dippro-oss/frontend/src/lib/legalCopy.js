// Libellés juridiques centralisés — DIPpro
//
// Source unique pour tout texte de l'interface qui touche à la portée
// légale de l'analyse de conformité. Un avocat peut valider ce fichier en
// un seul passage plutôt que de devoir relire chaque page qui affiche un
// score ou un statut de conformité. Voir aussi docs/LEGAL_COPY.md pour la
// version documentée avec les bases légales de chaque libellé.
//
// Règle absolue : ces textes ne doivent JAMAIS être remplacés par des
// formulations du type "rend le DIP invalide", "entraîne la nullité" ou
// "contrat nul" — la nullité d'un contrat de franchise n'est jamais
// automatique en droit français (Cass. com., 20 mars 2007, n°06-11.290).

export const COMPLIANCE_LEVEL_LABEL = {
  CONFORME: 'Conforme à la grille R.330-1',
  RÉVISIONS_MINEURES: 'Révisions mineures recommandées',
  RÉVISIONS_MAJEURES: 'Révisions majeures nécessaires',
  BLOQUANT_NON_ENVOYABLE: "Risque juridique élevé — remise déconseillée en l'état",
};

// Rappel affiché à côté du score, partout où il apparaît — le score mesure
// la complétude face à la grille R.330-1, pas une garantie d'issue
// contentieuse.
export const SCORE_DISCLAIMER =
  "Score indicatif d'aide à la préparation — ne constitue pas un avis juridique et ne remplace pas la validation par votre avocat.";

// Mention à faire figurer sur la landing page et tout rapport de résultat
// destiné à être lu hors de l'application (PDF exporté, email).
export const AVOCAT_DISCLAIMER =
  "DIPpro prépare et structure le travail de conformité ; il ne remplace pas la validation par un avocat.";

// La section 9 (Litiges) repose sur un fondement différent des 8 autres —
// le devoir général d'information (art. 1112-1 C. civ.) et le dol, pas la
// checklist R.330-1 — donc un libellé distinct plutôt que "Risque juridique
// élevé" générique. Un DIP conforme sur toutes les autres sections
// n'immunise pas contre ce risque spécifique (Cass. com., 26 juin 2024,
// n°23-14.085).
export const SECTION_9_WARNING = 'Risque de réticence dolosive (Cass. com., 26 juin 2024, n°23-14.085)';

// "Certifié" est réservé au fait technique vérifiable — l'horodatage
// SHA-256 de la remise. Jamais appliqué au jugement de conformité IA
// (non déterministe). Utiliser ce libellé, jamais "DIP certifié conforme"
// ou équivalent.
export const ATTESTATION_LABEL = 'Attestation de remise horodatée (empreinte SHA-256)';
