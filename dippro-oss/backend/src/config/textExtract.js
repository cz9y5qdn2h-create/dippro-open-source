const path = require('path');

// Extraction PDF via pdfjs-dist moderne (v4, build legacy Node) — remplace
// pdf-parse, dont les 4 moteurs pdf.js embarqués (2017-2018) plantent tous
// en "bad XRef entry" sous Node 22, y compris sur des PDF parfaitement
// valides. Vercel ayant migré ses fonctions sur Node 22, TOUTE extraction
// PDF du SaaS échouait, quel que soit le fichier. pdfjs-dist v4 est
// maintenu, tolérant aux tables xref malformées (ré-indexation automatique
// des objets), et n'a besoin ni de canvas ni de worker pour du texte seul.
let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

async function pdfToText(buffer) {
  const pdfjs = await loadPdfjs();
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  } catch (err) {
    const detail = err?.message || 'erreur inconnue';
    const structural = /xref|trailer|startxref|invalid pdf|corrupt|bad /i.test(detail);
    const wrapped = new Error(structural
      ? `Ce PDF a une structure interne endommagée (${detail}). Ouvrez-le puis ré-enregistrez-le via « Imprimer → Enregistrer au format PDF », ou ré-exportez-le depuis le logiciel d'origine, et réessayez.`
      : `Lecture du PDF impossible : ${detail}`);
    wrapped.cause = err;
    throw wrapped;
  }

  try {
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let lastY;
      let pageText = '';
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        if (lastY === undefined || lastY === item.transform[5]) pageText += item.str;
        else pageText += '\n' + item.str;
        lastY = item.transform[5];
      }
      text += pageText + '\n\n';
    }
    return text;
  } finally {
    await doc.destroy().catch(() => {});
  }
}

// strict=true : lève une erreur sur un format non supporté (upload de DIP ou
// contrat, où un fichier illisible doit bloquer). strict=false : retourne
// null (bibliothèque de documents, où les images sont acceptées sans
// extraction de texte).
async function extractText(buffer, filename, { strict = true } = {}) {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext === '.pdf') {
    return pdfToText(buffer);
  }
  if (ext === '.docx' || ext === '.doc') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (strict) throw new Error('Format non supporté (PDF ou DOCX requis)');
  return null;
}

module.exports = { extractText, pdfToText };
