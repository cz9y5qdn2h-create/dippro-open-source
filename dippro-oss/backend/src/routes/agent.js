const express = require('express');
const path = require('path');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const { parseDIPSections, generateDIPFromForm, formulateField, compareDIPVersions } = require('../config/claude');
const { generateDocx } = require('../config/docxGenerator');
const { supabaseAdmin } = require('../config/supabase');
const errMsg = require('../config/errorMessage');

const router = express.Router();

const MAX_TEXT_CHARS = 500_000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const sanitizeFilename = (name) =>
  String(name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);

const { extractText } = require('../config/textExtract');

// POST /api/agent/analyze — analyse un DIP existant (texte ou fichier)
router.post('/analyze', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    let rawText = req.body.text;

    if (!rawText && req.body.file) {
      const fileStr = String(req.body.file);
      if (fileStr.length > MAX_FILE_BYTES * 1.4) {
        return res.status(400).json({ error: 'Fichier trop volumineux (50 Mo max)' });
      }
      const buffer = Buffer.from(fileStr, 'base64');
      rawText = await extractText(buffer, sanitizeFilename(req.body.filename));
    }

    if (!rawText) return res.status(400).json({ error: 'text ou file requis' });
    if (rawText.length > MAX_TEXT_CHARS) rawText = rawText.substring(0, MAX_TEXT_CHARS);

    const result = await parseDIPSections(rawText);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/agent/generate — génère un DIP complet depuis le formulaire guidé
router.post('/generate', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    const { formData, file, filename } = req.body;
    if (!formData) return res.status(400).json({ error: 'formData requis' });

    let sourceText = '';
    if (file) {
      const fileStr = String(file);
      if (fileStr.length > MAX_FILE_BYTES * 1.4) {
        return res.status(400).json({ error: 'Fichier trop volumineux (50 Mo max)' });
      }
      const buffer = Buffer.from(fileStr, 'base64');
      sourceText = await extractText(buffer, sanitizeFilename(filename));
      if (sourceText.length > MAX_TEXT_CHARS) sourceText = sourceText.substring(0, MAX_TEXT_CHARS);
    }

    // Enrichit avec les résumés extraits de la bibliothèque de documents du
    // franchiseur (Kbis, comptes annuels, INPI...) — réduit la saisie manuelle.
    const { data: libraryDocs } = await supabaseAdmin
      .from('franchisor_documents')
      .select('document_type, file_name, extracted_summary')
      .eq('user_id', req.user.id)
      .eq('extraction_status', 'done')
      .not('extracted_summary', 'is', null);

    if (libraryDocs?.length > 0) {
      const libraryBlock = libraryDocs
        .map(d => `[${d.document_type} — ${d.file_name}]\n${d.extracted_summary}`)
        .join('\n\n');
      sourceText = sourceText
        ? `${sourceText}\n\n--- BIBLIOTHÈQUE DE DOCUMENTS DU FRANCHISEUR ---\n${libraryBlock}`
        : libraryBlock;
    }

    const result = await generateDIPFromForm(formData, sourceText);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/agent/formulate-field — rédige un champ du formulaire depuis des sous-questions guidées
router.post('/formulate-field', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    const { field_label, answers } = req.body;
    if (!field_label || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'field_label et answers requis' });
    }
    const text = await formulateField(field_label, answers);
    res.json({ success: true, text });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/agent/compare — compare deux versions d'un DIP
router.post('/compare', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    let { previousText, newText } = req.body;

    if (!previousText && req.body.previousFile) {
      const buf = Buffer.from(String(req.body.previousFile), 'base64');
      previousText = await extractText(buf, sanitizeFilename(req.body.filename));
    }
    if (!newText && req.body.newFile) {
      const buf = Buffer.from(String(req.body.newFile), 'base64');
      newText = await extractText(buf, sanitizeFilename(req.body.filename));
    }

    if (!previousText || !newText) return res.status(400).json({ error: 'previousText et newText requis' });

    if (previousText.length > MAX_TEXT_CHARS) previousText = previousText.substring(0, MAX_TEXT_CHARS);
    if (newText.length > MAX_TEXT_CHARS) newText = newText.substring(0, MAX_TEXT_CHARS);

    const result = await compareDIPVersions(previousText, newText);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/agent/docx — export DOCX du DIP généré
router.post('/docx', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    const { sections, companyName } = req.body;
    if (!sections) return res.status(400).json({ error: 'sections requis' });

    const safeName = String(companyName || 'franchiseur').replace(/[^a-z0-9]/gi, '_').substring(0, 100);
    const buffer = await generateDocx(sections, safeName);
    const filename = `DIP_${safeName}_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

module.exports = router;
