const express = require('express');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = require('docx');
const ExcelJS = require('exceljs');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { stripRichTextMarkers } = require('../config/richTextStrip');
const { buildDipDocumentPdf } = require('../config/documentPdf');
const router = express.Router();

const STATUS_LABEL = { conforme: 'Conforme', a_verifier: 'À vérifier', non_conforme: 'Non conforme' };

// Accessible au propriétaire du DIP, ou à un avocat ayant une relation active
// avec ce franchiseur (portail avocat — export en lecture seule).
async function loadDip(dipId, userId) {
  const { data: dip, error } = await supabaseAdmin
    .from('dip_documents')
    .select('*, dip_sections(*)')
    .eq('id', dipId)
    .single();
  if (error || !dip) return null;

  if (dip.user_id !== userId) {
    const { data: relation } = await supabaseAdmin
      .from('avocat_franchiseurs').select('status')
      .eq('avocat_id', userId).eq('franchiseur_id', dip.user_id).maybeSingle();
    if (relation?.status !== 'active') return null;
  }

  const sections = (dip.dip_sections || []).sort((a, b) => a.section_number - b.section_number);
  return { ...dip, dip_sections: sections };
}

async function loadUser(userId) {
  const { data } = await supabaseAdmin.from('users')
    .select('company_name, email, siret').eq('id', userId).single();
  return data || {};
}

// GET /api/export/:dipId/json
router.get('/:dipId/json', authMiddleware, async (req, res) => {
  const dip = await loadDip(req.params.dipId, req.user.id);
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const { data: history } = await supabaseAdmin
    .from('audit_log').select('*').eq('dip_id', req.params.dipId)
    .order('timestamp', { ascending: false });

  res.json({
    dip,
    sections: dip.dip_sections,
    history: history || [],
    exported_at: new Date().toISOString()
  });
});

// GET /api/export/:dipId/pdf — Rapport de conformité PDF
router.get('/:dipId/pdf', authMiddleware, async (req, res) => {
  const dip = await loadDip(req.params.dipId, req.user.id);
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const user = await loadUser(dip.user_id);
  const sections = dip.dip_sections || [];
  const conforme = sections.filter(s => s.status === 'conforme').length;
  const aVerifier = sections.filter(s => s.status === 'a_verifier').length;
  const nonConforme = sections.filter(s => s.status === 'non_conforme').length;
  const score = sections.length ? Math.round((conforme / sections.length) * 100) : 0;

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="rapport-conformite-${dip.id.substring(0, 8)}.pdf"`);
  doc.pipe(res);

  // En-tête
  doc.fillColor('#9C4141').fontSize(24).font('Helvetica-Bold').text('Rapport de Conformité DIP', { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor('#666').fontSize(10).font('Helvetica').text('Loi Doubin — Article L.330-3 du Code de commerce', { align: 'center' });
  doc.moveDown(2);

  // Bloc info
  doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text(user.company_name || 'Franchiseur');
  doc.font('Helvetica').fillColor('#444');
  doc.text(user.email || '');
  if (user.siret) doc.text('SIRET : ' + user.siret);
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#666').text('Document : ' + (dip.title || 'DIP'));
  doc.text('Date : ' + new Date().toLocaleDateString('fr-FR'));
  doc.text('Statut : ' + (dip.status || 'actif'));
  doc.moveDown(2);

  // Score global
  const scoreColor = score >= 80 ? '#22c55e' : score >= 50 ? '#9C4141' : '#ef4444';
  doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text('Score de conformité global', { underline: false });
  doc.moveDown(0.4);
  doc.fillColor(scoreColor).fontSize(48).font('Helvetica-Bold').text(score + '%', { align: 'center' });
  doc.moveDown(0.3);
  // Miroir de SCORE_DISCLAIMER (frontend/src/lib/legalCopy.js) — le score mesure
  // la complétude face à la grille R.330-1, pas une garantie d'issue contentieuse.
  doc.fillColor('#999').fontSize(8).font('Helvetica-Oblique')
    .text("Score indicatif d'aide à la préparation — ne constitue pas un avis juridique et ne remplace pas la validation par votre avocat.", { align: 'center' });
  doc.moveDown(1);

  // Stats
  const statY = doc.y;
  const colW = (doc.page.width - 100) / 3;
  const drawStat = (x, value, label, color) => {
    doc.fillColor(color).fontSize(20).font('Helvetica-Bold').text(value, x, statY, { width: colW, align: 'center' });
    doc.fillColor('#666').fontSize(9).font('Helvetica').text(label, x, statY + 28, { width: colW, align: 'center' });
  };
  drawStat(50, conforme, 'Conformes', '#22c55e');
  drawStat(50 + colW, aVerifier, 'À vérifier', '#9C4141');
  drawStat(50 + colW * 2, nonConforme, 'Non conformes', '#ef4444');

  doc.moveDown(4);
  doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text('Détail par section');
  doc.moveDown(0.5);

  for (const s of sections) {
    if (doc.y > 700) doc.addPage();
    const sColor = s.status === 'conforme' ? '#22c55e' : s.status === 'non_conforme' ? '#ef4444' : '#9C4141';
    doc.fillColor('#9C4141').fontSize(11).font('Helvetica-Bold')
      .text(`Section ${s.section_number} — ${s.section_title}`, { continued: false });
    doc.fillColor(sColor).fontSize(9).font('Helvetica-Bold').text(STATUS_LABEL[s.status] || s.status);
    doc.fillColor('#333').fontSize(9).font('Helvetica')
      .text(stripRichTextMarkers(s.content) || '— Section non renseignée —', { align: 'justify' });
    doc.moveDown(0.8);
  }

  // Pied de page sur toutes les pages
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.fillColor('#999').fontSize(8).font('Helvetica')
      .text(`DIPpro by Iralink — Page ${i + 1} / ${range.count} — Généré le ${new Date().toLocaleDateString('fr-FR')}`,
        50, doc.page.height - 35, { align: 'center', width: doc.page.width - 100 });
  }

  doc.end();
});

// GET /api/export/:dipId/document-pdf — le DIP en document classique (conventionnel)
router.get('/:dipId/document-pdf', authMiddleware, async (req, res) => {
  const dip = await loadDip(req.params.dipId, req.user.id);
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const user = await loadUser(dip.user_id);
  const safe = (user.company_name || 'DIP').replace(/[^a-z0-9]/gi, '_').substring(0, 40);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="DIP-${safe}.pdf"`);
  buildDipDocumentPdf(dip, user).pipe(res);
});

// GET /api/export/:dipId/docx — DIP reformulé en DOCX
router.get('/:dipId/docx', authMiddleware, async (req, res) => {
  const dip = await loadDip(req.params.dipId, req.user.id);
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const user = await loadUser(dip.user_id);
  const sections = dip.dip_sections || [];

  const children = [];

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'DOCUMENT D\'INFORMATION PRÉCONTRACTUELLE', bold: true, size: 36, color: 'C8A96E' })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Loi Doubin — Article L.330-3 du Code de commerce', italics: true, size: 20, color: '666666' })],
    spacing: { after: 400 }
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: user.company_name || 'Franchiseur', bold: true, size: 28 })]
  }));
  if (user.email) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: user.email, size: 20 })] }));
  }
  if (user.siret) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SIRET : ' + user.siret, size: 20 })] }));
  }
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Date : ' + new Date().toLocaleDateString('fr-FR'), size: 20, color: '666666' })],
    spacing: { after: 600 }
  }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  for (const s of sections) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: `Section ${s.section_number} — ${s.section_title}`, bold: true, color: 'C8A96E', size: 28 })],
      spacing: { before: 400, after: 200 }
    }));

    const content = (stripRichTextMarkers(s.content) || '— Section non renseignée —').split('\n');
    for (const line of content) {
      if (line.trim()) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 120 }
        }));
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      }
    }
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Document généré par DIPpro by Iralink', size: 18, color: '999999', italics: true })]
  }));

  const docDocx = new Document({
    creator: 'DIPpro',
    title: dip.title || 'DIP',
    sections: [{ properties: {}, children }]
  });

  const buffer = await Packer.toBuffer(docDocx);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition',
    `attachment; filename="dip-${(user.company_name || 'document').replace(/\s+/g, '_').toLowerCase()}-${dip.id.substring(0, 8)}.docx"`);
  res.send(buffer);
});

// GET /api/export/:dipId/xlsx — DIP complet en Excel (10 sections, réimportable)
router.get('/:dipId/xlsx', authMiddleware, async (req, res) => {
  const dip = await loadDip(req.params.dipId, req.user.id);
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const user = await loadUser(dip.user_id);
  const sections = dip.dip_sections || [];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DIPpro';
  wb.created = new Date();

  // Feuille Métadonnées
  const meta = wb.addWorksheet('Métadonnées', { properties: { tabColor: { argb: 'FFC8A96E' } } });
  meta.columns = [
    { header: 'Champ', key: 'champ', width: 30 },
    { header: 'Valeur', key: 'valeur', width: 60 },
  ];
  [
    ['Entreprise', user.company_name || ''],
    ['Email', user.email || ''],
    ['SIRET', user.siret || ''],
    ['Titre DIP', dip.title || ''],
    ['Score de conformité', `${dip.conformity_score || 0}%`],
    ['Statut', dip.status || ''],
    ['Date d\'import', dip.upload_date ? new Date(dip.upload_date).toLocaleDateString('fr-FR') : ''],
    ['Exporté le', new Date().toLocaleDateString('fr-FR')],
    ['DIPpro ID', dip.id],
  ].forEach(([champ, valeur]) => meta.addRow({ champ, valeur }));

  meta.getRow(1).font = { bold: true, color: { argb: 'FFC8A96E' } };

  // Une feuille par section
  for (const s of sections) {
    const sheetName = `S${s.section_number} — ${(s.section_title || '').substring(0, 20)}`;
    const ws = wb.addWorksheet(sheetName);

    ws.columns = [
      { header: 'Champ', key: 'champ', width: 28 },
      { header: 'Valeur', key: 'valeur', width: 80 },
    ];

    ws.addRow({ champ: 'section_id', valeur: s.id });
    ws.addRow({ champ: 'section_number', valeur: s.section_number });
    ws.addRow({ champ: 'section_title', valeur: s.section_title });
    ws.addRow({ champ: 'status', valeur: s.status });
    ws.addRow({ champ: '--- CONTENU (modifiable) ---', valeur: '' });
    ws.addRow({ champ: 'content', valeur: s.content || '' });

    ws.getRow(1).font = { bold: true, color: { argb: 'FFC8A96E' } };

    const contentCell = ws.getCell('B6');
    contentCell.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(6).height = 200;

    const statusCell = ws.getCell('B4');
    const statusColors = { conforme: 'FF22C55E', a_verifier: 'FFC8A96E', non_conforme: 'FFEF4444' };
    statusCell.font = { color: { argb: statusColors[s.status] || 'FF666666' }, bold: true };
  }

  // Feuille synthèse (toutes sections en lignes)
  const synth = wb.addWorksheet('Synthèse', { properties: { tabColor: { argb: 'FF22C55E' } } });
  synth.columns = [
    { header: 'N°', key: 'num', width: 6 },
    { header: 'Section', key: 'title', width: 35 },
    { header: 'Statut', key: 'status', width: 18 },
    { header: 'Contenu', key: 'content', width: 80 },
    { header: 'ID', key: 'id', width: 38 },
  ];
  synth.getRow(1).font = { bold: true, color: { argb: 'FFC8A96E' } };
  for (const s of sections) {
    const row = synth.addRow({ num: s.section_number, title: s.section_title, status: STATUS_LABEL[s.status] || s.status, content: stripRichTextMarkers(s.content) || '', id: s.id });
    row.getCell('content').alignment = { wrapText: true };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',
    `attachment; filename="dip-${(user.company_name || 'document').replace(/\s+/g, '_').toLowerCase()}-${dip.id.substring(0, 8)}.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
});

// POST /api/export/:dipId/import-xlsx — ré-import d'un fichier Excel édité
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/:dipId/import-xlsx', authMiddleware, upload.single('file'), async (req, res) => {
  const dip = await loadDip(req.params.dipId, req.user.id);
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });
  // loadDip autorise aussi un avocat en lecture (export PDF/JSON/XLSX) — mais
  // cette route ÉCRIT dans le DIP, donc seul le propriétaire peut l'utiliser.
  if (dip.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Seul le franchiseur propriétaire peut importer des modifications.' });
  }
  if (!req.file) return res.status(400).json({ error: 'Fichier Excel requis' });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(req.file.buffer);

  const synth = wb.getWorksheet('Synthèse');
  if (!synth) return res.status(422).json({ error: 'Feuille "Synthèse" introuvable — fichier invalide' });

  const updates = [];
  synth.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const sectionId = String(row.getCell(5).value || '').trim();
    const content = String(row.getCell(4).value || '').trim();
    if (sectionId && sectionId.length === 36) {
      updates.push({ id: sectionId, content, last_edited_by: req.user.id, last_edited_at: new Date().toISOString() });
    }
  });

  if (updates.length === 0) return res.status(422).json({ error: 'Aucune section valide trouvée dans la feuille Synthèse' });

  const errors = [];
  for (const u of updates) {
    const { error } = await supabaseAdmin.from('dip_sections')
      .update({ content: u.content, last_edited_by: u.last_edited_by, last_edited_at: u.last_edited_at })
      .eq('id', u.id).eq('dip_id', req.params.dipId);
    if (error) errors.push(u.id);
  }

  if (errors.length > 0) return res.status(500).json({ error: `Erreur sur ${errors.length} section(s)` });

  res.json({ ok: true, updated: updates.length });
});

// Backward compat HTML
router.get('/:dipId/report', authMiddleware, async (req, res) => {
  res.redirect('/api/export/' + req.params.dipId + '/pdf');
});

module.exports = router;
