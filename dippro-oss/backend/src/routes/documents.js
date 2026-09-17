const express = require('express');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const { resolveScopedUserId } = require('../middleware/avocatScope');
const { extractDocumentData, classifyDocumentType, DOCUMENT_TYPES } = require('../config/claude');
const errMsg = require('../config/errorMessage');
const router = express.Router();

const BUCKET = 'franchisor-documents';
const VALID_TYPES = new Set(DOCUMENT_TYPES.map(t => t.key));

let bucketReady = false;
const ensureBucket = async () => {
  if (bucketReady) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some(b => b.id === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 26214400, // 25 Mo
      allowedMimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'image/png',
        'image/jpeg',
      ]
    });
  }
  bucketReady = true;
};

const { extractText: sharedExtractText } = require('../config/textExtract');

// strict:false — les images sont acceptées sans extraction de texte
// (stockage seul), contrairement aux uploads de DIP/contrat qui exigent
// un document lisible.
const extractText = (buffer, filename) => sharedExtractText(buffer, filename, { strict: false });

// GET /api/documents/types — checklist de référence (types + section DIP associée)
router.get('/types', authMiddleware, (req, res) => {
  res.json({ types: DOCUMENT_TYPES });
});

// GET /api/documents/upload-url — URL signée pour upload direct vers Supabase Storage
router.get('/upload-url', authMiddleware, requireFranchisor, async (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).json({ error: 'filename requis' });

  const sanitized = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
  const ext = path.extname(sanitized).toLowerCase();
  if (!['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg'].includes(ext)) {
    return res.status(400).json({ error: 'Format non supporté. Utilisez PDF, DOCX, DOC, PNG ou JPG.' });
  }

  try {
    await ensureBucket();
    const storagePath = `${req.user.id}/${Date.now()}_${sanitized}`;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error) return res.status(500).json({ error: 'Impossible de générer le lien upload: ' + error.message });
    res.json({ signed_url: data.signedUrl, storage_path: storagePath });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/documents — enregistre un document après upload, lance l'extraction IA
router.post('/', authMiddleware, requireFranchisor, async (req, res) => {
  const { file_name, storage_path } = req.body;
  let { document_type } = req.body;
  if (!file_name || !storage_path) {
    return res.status(400).json({ error: 'file_name et storage_path requis' });
  }
  // document_type reste optionnel — glisser un fichier dans la zone de dépôt
  // générale ne l'indique pas, l'IA le devine depuis le contenu (voir tâche
  // de fond ci-dessous). VALID_TYPES ne s'applique donc qu'en présence d'une
  // valeur explicite (choisie via un slot précis de la checklist).
  if (document_type && !VALID_TYPES.has(document_type)) {
    return res.status(400).json({ error: 'document_type invalide' });
  }
  // Le chemin doit appartenir au dossier de l'utilisateur (évite qu'un utilisateur enregistre un fichier d'un autre)
  if (!storage_path.startsWith(`${req.user.id}/`)) {
    return res.status(403).json({ error: 'Chemin de stockage invalide' });
  }

  try {
    const { data: signedUrlData } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(storage_path, 3600);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('franchisor_documents')
      .insert({
        user_id: req.user.id,
        document_type: document_type || 'autre',
        file_name: file_name.substring(0, 255),
        storage_path,
        file_url: signedUrlData?.signedUrl || null,
        extraction_status: 'pending',
      })
      .select()
      .single();
    if (insertError) throw new Error(insertError.message);

    // Extraction IA en arrière-plan — ne bloque pas la réponse à l'utilisateur
    (async () => {
      try {
        const { data: fileBlob, error: dlError } = await supabaseAdmin.storage.from(BUCKET).download(storage_path);
        if (dlError || !fileBlob) throw new Error(dlError?.message || 'Téléchargement impossible');
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const text = await extractText(buffer, file_name);

        if (!text || text.trim().length < 20) {
          await supabaseAdmin.from('franchisor_documents')
            .update({ extraction_status: 'done', extracted_summary: null })
            .eq('id', inserted.id);
          return;
        }

        let resolvedType = document_type;
        if (!resolvedType) {
          resolvedType = await classifyDocumentType(text, file_name);
          await supabaseAdmin.from('franchisor_documents').update({ document_type: resolvedType }).eq('id', inserted.id);
        }

        const summary = await extractDocumentData(text, resolvedType, file_name);
        await supabaseAdmin.from('franchisor_documents')
          .update({ extraction_status: 'done', extracted_summary: summary })
          .eq('id', inserted.id);
      } catch (err) {
        console.error('[documents] extraction error:', err.message);
        await supabaseAdmin.from('franchisor_documents')
          .update({ extraction_status: 'failed' })
          .eq('id', inserted.id);
      }
    })();

    res.status(201).json({ document: inserted });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// GET /api/documents — liste les documents + checklist de complétude
router.get('/', authMiddleware, async (req, res) => {
  const scopedUserId = await resolveScopedUserId(req);
  if (!scopedUserId) return res.status(403).json({ error: 'Accès refusé' });

  const { data, error } = await supabaseAdmin
    .from('franchisor_documents')
    .select('id, document_type, file_name, file_url, extraction_status, extracted_summary, uploaded_at')
    .eq('user_id', scopedUserId)
    .order('uploaded_at', { ascending: false });
  if (error) return res.status(500).json({ error: errMsg(error) });

  const documents = data || [];
  const presentTypes = new Set(documents.map(d => d.document_type));
  const checklist = DOCUMENT_TYPES.map(t => ({
    ...t,
    present: presentTypes.has(t.key),
    documents: documents.filter(d => d.document_type === t.key),
  }));

  const requiredTotal = DOCUMENT_TYPES.filter(t => t.required).length;
  const requiredPresent = checklist.filter(t => t.required && t.present).length;

  res.json({
    documents,
    checklist,
    completeness: { required_present: requiredPresent, required_total: requiredTotal },
  });
});

// DELETE /api/documents/:id
router.delete('/:id', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('franchisor_documents')
    .select('storage_path')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (fetchError || !doc) return res.status(404).json({ error: 'Document introuvable' });

  await supabaseAdmin.storage.from(BUCKET).remove([doc.storage_path]);
  const { error } = await supabaseAdmin.from('franchisor_documents').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: errMsg(error) });

  res.json({ success: true });
});

module.exports = router;
