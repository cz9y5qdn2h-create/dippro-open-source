const PDFDocument = require('pdfkit');
const { stripRichTextMarkers } = require('./richTextStrip');

// Convertit un PDFDocument déjà terminé (.end() appelé) en Buffer — utilisé
// quand le PDF doit être joint à un email plutôt que streamé en réponse HTTP.
function pdfDocToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

// DIP en document classique (conventionnel) — extrait de export.js pour être
// réutilisable par la route "Envoyer au client" sans dupliquer une version
// dégradée du même document.
function buildDipDocumentPdf(dip, user) {
  const sections = (dip.dip_sections || []).slice().sort((a, b) => a.section_number - b.section_number);
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });

  doc.moveDown(7);
  doc.fillColor('#111').fontSize(26).font('Helvetica-Bold')
    .text("Document d'Information Précontractuelle", { align: 'center' });
  doc.moveDown(0.5);
  doc.fillColor('#888').fontSize(11).font('Helvetica')
    .text('Loi Doubin — Article L.330-3 du Code de commerce', { align: 'center' });
  doc.moveDown(3);
  doc.fillColor('#000').fontSize(16).font('Helvetica-Bold')
    .text(user.company_name || 'Franchiseur', { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor('#444').fontSize(10).font('Helvetica');
  if (user.siret) doc.text('SIRET : ' + user.siret, { align: 'center' });
  doc.text('Établi le ' + new Date().toLocaleDateString('fr-FR'), { align: 'center' });
  doc.moveDown(3);
  doc.fillColor('#999').fontSize(8).font('Helvetica')
    .text("Ce document doit être remis au candidat franchisé au moins 20 jours avant la signature du contrat de franchise (Art. L.330-3 du Code de commerce).",
      100, doc.y, { align: 'center', width: doc.page.width - 200 });

  doc.addPage();
  sections.forEach((s, idx) => {
    if (idx > 0) doc.moveDown(1.3);
    doc.fillColor('#9C4141').fontSize(9).font('Helvetica-Bold')
      .text(`SECTION ${s.section_number}`, { characterSpacing: 1 });
    doc.moveDown(0.15);
    doc.fillColor('#111').fontSize(14).font('Helvetica-Bold').text(s.section_title || '');
    doc.moveDown(0.4);
    doc.fillColor('#222').fontSize(10.5).font('Helvetica')
      .text(s.content || 'Non renseigné', { align: 'justify', lineGap: 2 });
  });

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;
    doc.fillColor('#999').fontSize(8).font('Helvetica')
      .text(`${user.company_name || 'DIP'} — Document d'Information Précontractuelle — Page ${i + 1} / ${range.count}`,
        50, doc.page.height - 35, { align: 'center', width: doc.page.width - 100, lineBreak: false });
  }

  doc.end();
  return doc;
}

// Contrat de franchise en PDF — extrait de contracts.js, même logique.
function buildContractPdf(contract, user) {
  const clauses = (contract.contract_clauses || []).slice().sort((a, b) => a.clause_number - b.clause_number);
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });

  doc.moveDown(7);
  doc.fillColor('#111').fontSize(26).font('Helvetica-Bold').text('Contrat de Franchise', { align: 'center' });
  if (contract.title) {
    doc.moveDown(0.5);
    doc.fillColor('#888').fontSize(12).font('Helvetica').text(contract.title, { align: 'center' });
  }
  doc.moveDown(3);
  doc.fillColor('#000').fontSize(16).font('Helvetica-Bold').text(user?.company_name || 'Franchiseur', { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor('#444').fontSize(10).font('Helvetica');
  if (user?.siret) doc.text('SIRET : ' + user.siret, { align: 'center' });
  doc.text('Établi le ' + new Date().toLocaleDateString('fr-FR'), { align: 'center' });

  doc.addPage();
  clauses.forEach((c, idx) => {
    if (idx > 0) doc.moveDown(1.3);
    doc.fillColor('#9C4141').fontSize(9).font('Helvetica-Bold')
      .text(`ARTICLE ${c.clause_number}`, { characterSpacing: 1 });
    doc.moveDown(0.15);
    doc.fillColor('#111').fontSize(14).font('Helvetica-Bold').text(c.clause_title || '');
    doc.moveDown(0.4);
    doc.fillColor('#222').fontSize(10.5).font('Helvetica')
      .text(stripRichTextMarkers(c.content) || 'Non renseigné', { align: 'justify', lineGap: 2 });
  });

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;
    doc.fillColor('#999').fontSize(8).font('Helvetica')
      .text(`Contrat de franchise — ${user?.company_name || ''} — Page ${i + 1} / ${range.count}`,
        50, doc.page.height - 35, { align: 'center', width: doc.page.width - 100, lineBreak: false });
  }

  doc.end();
  return doc;
}

module.exports = { pdfDocToBuffer, buildDipDocumentPdf, buildContractPdf };
