// Retire les marqueurs de mise en forme légère (**gras**, ==surligné==,
// ~~barré~~, *italique*) du contenu d'une section/clause avant de l'insérer
// dans un PDF ou un DOCX généré côté serveur — ces générateurs (pdfkit,
// docx) ne savent pas encore interpréter ces marqueurs, donc sans ce
// nettoyage un document exporté/signé afficherait des astérisques littéraux
// au lieu du texte mis en forme. Dégrade proprement vers du texte brut
// plutôt que de casser visuellement le document. Miroir de
// frontend/src/lib/richText.js:stripRichTextMarkers — les deux doivent
// rester synchronisés si les marqueurs supportés évoluent.
function stripRichTextMarkers(source) {
  return (source || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1$2')
    .replace(/\b_(.+?)_\b/g, '$1');
}

module.exports = { stripRichTextMarkers };
