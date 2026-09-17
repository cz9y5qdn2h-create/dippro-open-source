const express = require('express');
const { getAppUrl } = require('../config/appUrl');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const { getActiveAvocatRelation } = require('../middleware/avocatScope');
const { parseDIPSections, compareDIPVersions, assessLitigationRisks, correctSection, correctSectionWithAnswers } = require('../config/claude');
const { triggerCrossImpactAlerts } = require('../utils/crossImpact');
const { createCertificate } = require('./certificates');
const { findIncompleteMarker, buildIncompleteAlerts } = require('../config/incompleteContentCheck');
const errMsg = require('../config/errorMessage');
const router = express.Router();

const sha256hex = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const BUCKET = 'dip-files';

// Cache mémoire — évite une requête Supabase à chaque upload
let bucketReady = false;

const { extractText } = require('../config/textExtract');

const ensureBucket = async () => {
  if (bucketReady) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some(b => b.id === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ]
    });
  }
  bucketReady = true;
};

// GET /api/dip/upload-url — génère une URL signée pour upload direct vers Supabase Storage
router.get('/upload-url', authMiddleware, requireFranchisor, async (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).json({ error: 'filename requis' });

  const sanitized = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
  const ext = path.extname(sanitized).toLowerCase();
  if (!['.pdf', '.docx', '.doc'].includes(ext)) {
    return res.status(400).json({ error: 'Format non supporté. Utilisez PDF ou DOCX.' });
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
    console.error('upload-url error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/dip/process — télécharge depuis Storage, extrait le texte, analyse avec Claude
router.post('/process', authMiddleware, requireFranchisor, async (req, res) => {
  const { storage_path, title, signed_url } = req.body;
  if (!storage_path) return res.status(400).json({ error: 'storage_path requis' });
  if (!storage_path.startsWith(`${req.user.id}/`)) {
    return res.status(403).json({ error: 'storage_path invalide' });
  }

  try {
    let buffer;

    // Tentative 1 : téléchargement via service_role (rapide)
    const { data: fileBlob, error: dlError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(storage_path);

    if (!dlError && fileBlob) {
      const arrayBuffer = await fileBlob.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (signed_url) {
      // Fallback : utiliser l'URL signée fournie par le frontend
      const httpRes = await fetch(signed_url);
      if (!httpRes.ok) {
        throw new Error('Impossible de récupérer le fichier (signed URL): ' + httpRes.status);
      }
      const arrayBuffer = await httpRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error('Téléchargement impossible: ' + (dlError?.message || 'bucket inaccessible. Aucune URL signée fournie.'));
    }

    const fileHash = sha256hex(buffer);
    const rawText  = await extractText(buffer, storage_path);

    if (!rawText || rawText.trim().length < 50) {
      throw new Error('Le fichier ne contient pas assez de texte lisible. Vérifiez que le PDF n\'est pas scanné (image) ou protégé.');
    }

    let fileUrl = null;
    try {
      const { data: signedData } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(storage_path, 60 * 60 * 24 * 7);
      fileUrl = signedData?.signedUrl || null;
    } catch {
      fileUrl = signed_url || null;
    }
    const docTitle = title || path.basename(storage_path).replace(/^\d+_/, '').replace(/\.(pdf|docx|doc)$/i, '');

    // Vérifier s'il existe déjà un DIP actif
    const { data: existingDips } = await supabaseAdmin
      .from('dip_documents')
      .select('id, raw_text, title, conformity_score')
      .eq('user_id', req.user.id)
      .eq('status', 'actif')
      .order('created_at', { ascending: false })
      .limit(1);

    const previousDip = existingDips?.[0];

    // MODE COMPARAISON : DIP existant détecté
    if (previousDip && previousDip.raw_text) {
      const comparison = await compareDIPVersions(previousDip.raw_text, rawText);

      const { data: draftDip, error: draftError } = await supabaseAdmin
        .from('dip_documents')
        .insert({
          user_id:          req.user.id,
          title:            docTitle,
          file_url:         fileUrl,
          status:           'brouillon',
          conformity_score: previousDip.conformity_score,
          raw_text:         rawText.substring(0, 50000),
          sha256:           fileHash
        })
        .select()
        .single();

      if (draftError) throw new Error(draftError.message);

      await supabaseAdmin.from('audit_log').insert({
        dip_id: draftDip.id,
        action: 'upload_nouvelle_version',
        user_id: req.user.id,
        new_content: JSON.stringify({
          filename: path.basename(storage_path),
          nb_changements: comparison.changements?.length || 0,
          previous_dip_id: previousDip.id
        }),
        timestamp: new Date().toISOString()
      });

      // Tunnel : un changement de DIP substantiel peut impacter le contrat de franchise lié
      if (comparison.changements?.length > 0) {
        const { data: linkedContract } = await supabaseAdmin
          .from('franchise_contracts')
          .select('id')
          .eq('linked_dip_id', previousDip.id)
          .eq('status', 'actif')
          .limit(1)
          .single();

        if (linkedContract) {
          await triggerCrossImpactAlerts({
            sourceType: 'dip',
            changes: comparison.changements,
            contractId: linkedContract.id
          }).catch(err => console.error('Cross-impact (dip->contract) error:', err.message));
        }
      }

      return res.json({
        mode:                    'comparison',
        draft_dip_id:            draftDip.id,
        previous_dip_id:         previousDip.id,
        sha256:                  fileHash,
        changements:             comparison.changements || [],
        resume:                  comparison.resume,
        nb_changements_critiques: comparison.nb_changements_critiques || 0
      });
    }

    // MODE INITIAL : premier DIP
    const parsed = await parseDIPSections(rawText);

    const { data: dipDoc, error: dipError } = await supabaseAdmin
      .from('dip_documents')
      .insert({
        user_id:          req.user.id,
        title:            docTitle,
        file_url:         fileUrl,
        status:           'actif',
        conformity_score: parsed.global_score || 0,
        raw_text:         rawText.substring(0, 50000),
        sha256:           fileHash,
        compliance_level: parsed.compliance_level || null,
        blocking_issues:  parsed.blocking_issues  || []
      })
      .select()
      .single();

    if (dipError) throw new Error(dipError.message);

    const sectionsToInsert = (parsed.sections || []).map(s => ({
      dip_id:                      dipDoc.id,
      section_number:              s.section_number,
      section_title:               s.section_title,
      content:                     s.content,
      status:                      s.status || 'a_verifier',
      legal_blocking:              s.legal_blocking              || false,
      mandatory_elements_found:    s.mandatory_elements_found    || [],
      mandatory_elements_missing:  s.mandatory_elements_missing  || [],
      legal_reference:             s.legal_reference             || null,
      last_checked:                new Date().toISOString(),
      last_updated:                new Date().toISOString()
    }));

    if (sectionsToInsert.length > 0) {
      await supabaseAdmin.from('dip_sections').insert(sectionsToInsert);
    }

    await supabaseAdmin.from('audit_log').insert({
      dip_id: dipDoc.id,
      action: 'upload_initial',
      user_id: req.user.id,
      new_content: JSON.stringify({
        filename: path.basename(storage_path),
        score: parsed.global_score,
        sections: sectionsToInsert.length
      }),
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      mode:             'initial',
      dip:              dipDoc,
      sha256:           fileHash,
      sections_count:   sectionsToInsert.length,
      conformity_score: parsed.global_score,
      compliance_level: parsed.compliance_level,
      blocking_issues:  parsed.blocking_issues || [],
      summary:          parsed.summary
    });

  } catch (err) {
    console.error('DIP process error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/dip/approve-changes
router.post('/approve-changes', authMiddleware, requireFranchisor, async (req, res) => {
  const { draft_dip_id, previous_dip_id, approved_changes } = req.body;
  if (!draft_dip_id || !previous_dip_id) {
    return res.status(400).json({ error: 'draft_dip_id et previous_dip_id requis' });
  }

  try {
    await supabaseAdmin
      .from('dip_documents')
      .update({ status: 'archive' })
      .eq('id', previous_dip_id)
      .eq('user_id', req.user.id);

    const { data: newDip, error: activateError } = await supabaseAdmin
      .from('dip_documents')
      .update({ status: 'actif' })
      .eq('id', draft_dip_id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (activateError) throw new Error(activateError.message);

    const { data: previousSections } = await supabaseAdmin
      .from('dip_sections')
      .select('*')
      .eq('dip_id', previous_dip_id)
      .order('section_number');

    if (previousSections?.length > 0) {
      const newSections = previousSections.map(s => ({
        dip_id: draft_dip_id,
        section_number: s.section_number,
        section_title: s.section_title,
        content: s.content,
        status: s.status,
        legal_blocking: s.legal_blocking || false,
        mandatory_elements_found: s.mandatory_elements_found || [],
        mandatory_elements_missing: s.mandatory_elements_missing || [],
        legal_reference: s.legal_reference || null,
        last_checked: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }));

      if (approved_changes?.length > 0) {
        approved_changes.forEach(change => {
          const section = newSections.find(s => s.section_number === change.section_number);
          if (section && change.proposition_texte) {
            section.content = change.proposition_texte;
            section.status = 'a_verifier';
            section.last_updated = new Date().toISOString();
          }
        });
      }

      await supabaseAdmin.from('dip_sections').insert(newSections);

      const conformeCount = newSections.filter(s => s.status === 'conforme').length;
      const score = Math.round((conformeCount / newSections.length) * 100);
      await supabaseAdmin.from('dip_documents').update({ conformity_score: score }).eq('id', draft_dip_id);
    }

    await supabaseAdmin.from('audit_log').insert({
      dip_id: draft_dip_id,
      action: 'version_approved',
      user_id: req.user.id,
      new_content: JSON.stringify({ nb_changes_approved: approved_changes?.length || 0, previous_dip_id }),
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Nouvelle version activée', dip: newDip });
  } catch (err) {
    console.error('Approve changes error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// GET /api/dip — retourne les DIPs actifs et brouillons, avec fallback archive
router.get('/', authMiddleware, async (req, res) => {
  // raw_text exclu de la liste (peut peser 50KB par DIP)
  const COLS = 'id,user_id,title,file_url,status,conformity_score,compliance_level,blocking_issues,sha256,share_token,share_token_views,upload_date,created_at,updated_at,signature_image,signed_by,signed_at,dip_sections(id,section_number,section_title,status,last_checked,last_updated,content)';

  // ?all=true retourne toutes les versions (historique)
  if (req.query.all === 'true') {
    const { data, error } = await supabaseAdmin
      .from('dip_documents')
      .select(COLS)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: errMsg(error) });
    res.set('Cache-Control', 'private, max-age=30');
    return res.json({ dips: data || [] });
  }

  // Retourne actif + brouillon (brouillon = nouvelle version en attente d'approbation)
  const { data, error } = await supabaseAdmin
    .from('dip_documents')
    .select(COLS)
    .eq('user_id', req.user.id)
    .in('status', ['actif', 'brouillon'])
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: errMsg(error) });

  if (data && data.length > 0) {
    res.set('Cache-Control', 'private, max-age=30');
    return res.json({ dips: data });
  }

  // Fallback : retourne le DIP archivé le plus récent si aucun actif/brouillon
  const { data: archived } = await supabaseAdmin
    .from('dip_documents')
    .select(COLS)
    .eq('user_id', req.user.id)
    .eq('status', 'archive')
    .order('created_at', { ascending: false })
    .limit(1);

  res.set('Cache-Control', 'private, max-age=30');
  res.json({ dips: archived || [] });
});

// GET /api/dip/shared/:token — public, retourne le DIP pour les franchisés
// IMPORTANT : doit être AVANT GET /:id pour éviter que "shared" soit traité comme un ID
router.get('/shared/:token', async (req, res) => {
  const token = req.params.token;
  if (!token || token.length > 100) return res.status(400).json({ error: 'Token invalide' });

  const { data: dip, error } = await supabaseAdmin
    .from('dip_documents')
    .select('id, title, conformity_score, status, created_at, share_token_views, dip_sections(*)')
    .eq('share_token', token)
    .single();

  if (error || !dip) return res.status(404).json({ error: 'DIP introuvable ou lien expiré' });

  await supabaseAdmin.from('dip_documents')
    .update({ share_token_views: (dip.share_token_views || 0) + 1 })
    .eq('id', dip.id);

  const sections = (dip.dip_sections || [])
    .sort((a, b) => a.section_number - b.section_number)
    .map(s => ({
      id: s.id,
      section_number: s.section_number,
      section_title: s.section_title,
      content: s.content,
      status: s.status,
      last_updated: s.last_updated
    }));

  res.json({
    dip: {
      id: dip.id,
      title: dip.title,
      conformity_score: dip.conformity_score,
      created_at: dip.created_at,
      sections
    }
  });
});

// GET /api/dip/:id — détail
router.get('/:id', authMiddleware, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('dip_documents')
    .select('*, dip_sections(*)')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'DIP introuvable' });
  res.json({ dip: data });
});

// PUT /api/dip/:id/sections/:sectionId
router.put('/:id/sections/:sectionId', authMiddleware, requireFranchisor, async (req, res) => {
  const { content, status } = req.body;

  const { data: ownerDip } = await supabaseAdmin
    .from('dip_documents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!ownerDip) return res.status(404).json({ error: 'DIP introuvable' });

  const { data: existing } = await supabaseAdmin
    .from('dip_sections').select('*').eq('id', req.params.sectionId).eq('dip_id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Section introuvable' });

  await supabaseAdmin.from('audit_log').insert({
    dip_id: req.params.id,
    section_id: req.params.sectionId,
    action: 'section_update',
    old_content: existing.content,
    new_content: content,
    user_id: req.user.id,
    timestamp: new Date().toISOString()
  });

  // Toute édition directe par le franchiseur remet la validation avocat à
  // zéro : un contenu déjà validé qui change de nouveau redevient "pending"
  // — l'avocat n'a jamais confirmé cette version-là.
  const contentChanged = existing.content !== content;
  const avocatRelation = contentChanged ? await getActiveAvocatRelation(req.user.id) : null;

  const { data, error } = await supabaseAdmin
    .from('dip_sections')
    .update({
      content, status, last_updated: new Date().toISOString(),
      ...(avocatRelation ? {
        avocat_validation_status: 'pending',
        avocat_validated_by: null,
        avocat_validated_at: null,
        avocat_validation_comment: null,
      } : {}),
    })
    .eq('id', req.params.sectionId)
    .select().single();

  if (error) return res.status(500).json({ error: errMsg(error) });

  const { data: allSections } = await supabaseAdmin
    .from('dip_sections').select('status').eq('dip_id', req.params.id);
  const conformeCount = allSections.filter(s => s.status === 'conforme').length;
  const score = Math.round((conformeCount / allSections.length) * 100);
  await supabaseAdmin.from('dip_documents').update({ conformity_score: score }).eq('id', req.params.id);

  // Attestation de mise à jour — jusqu'ici uniquement générée en réimportant
  // un fichier, jamais pour une édition directe de section : le franchiseur
  // n'avait donc aucune preuve horodatée de ce chemin de modification, et ses
  // franchisés n'étaient jamais notifiés (la notification part de la même
  // tâche de fond). Non-bloquant : une erreur ici ne doit pas faire échouer
  // l'enregistrement de la section elle-même.
  if (existing.content !== content) {
    createCertificate({
      userId: req.user.id,
      userEmail: req.user.email,
      dipId: req.params.id,
      certificateType: 'MISE_A_JOUR',
      changes: [{
        id: req.params.sectionId,
        type: 'modification_section',
        section: existing.section_title,
        section_number: existing.section_number,
        ancien: existing.content || '',
        nouveau: content || '',
        impact_legal: 'Moderate',
        recommandation_ia: 'Modification directe par le franchiseur — vérifier la cohérence avec le reste du DIP.',
      }],
    }).catch(e => console.error('Certificate auto-gen error (section update):', e.message));
  }

  // Alerte "contenu à compléter" — les corrections guidées par l'IA (widget
  // "Aide à la rédaction") insèrent "[À COMPLÉTER : ...]" dans le texte
  // quand une donnée manquante l'empêche de rédiger un passage complet ;
  // rien ne prévenait le franchiseur si ce texte était sauvegardé tel quel.
  const incompleteMarker = findIncompleteMarker(content);
  if (incompleteMarker) {
    await supabaseAdmin.from('alerts').insert({
      dip_id: req.params.id,
      section_id: req.params.sectionId,
      source: 'Contenu à compléter',
      suggestion: `La section « ${existing.section_title} » contient un passage non finalisé : « ${incompleteMarker} ». Complétez-le avant la remise du DIP.`,
      urgency: 'haute',
      status: 'pending',
    }).then(({ error }) => { if (error) console.error('Incomplete-content alert error:', error.message); });
  }

  res.json({ section: data, conformity_score: score });
});

// POST /api/dip/:id/signature — case signature du document (DIP)
router.post('/:id/signature', authMiddleware, requireFranchisor, async (req, res) => {
  const { signature_image, signed_by } = req.body;
  if (!signature_image?.trim() || !signed_by?.trim()) {
    return res.status(400).json({ error: 'signature_image et signed_by requis' });
  }

  const { data: ownerDip } = await supabaseAdmin
    .from('dip_documents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!ownerDip) return res.status(404).json({ error: 'DIP introuvable' });

  const { data, error } = await supabaseAdmin
    .from('dip_documents')
    .update({ signature_image, signed_by: signed_by.trim().substring(0, 200), signed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('id, signature_image, signed_by, signed_at').single();

  if (error) return res.status(500).json({ error: errMsg(error) });
  res.json({ dip: data });
});

// DELETE /api/dip/:id/signature — réinitialise la signature
router.delete('/:id/signature', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: ownerDip } = await supabaseAdmin
    .from('dip_documents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!ownerDip) return res.status(404).json({ error: 'DIP introuvable' });

  const { error } = await supabaseAdmin
    .from('dip_documents')
    .update({ signature_image: null, signed_by: null, signed_at: null })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: errMsg(error) });
  res.json({ success: true });
});

// POST /api/dip/:id/sections/:sectionId/ai-assist — widget "Aide à la rédaction"
// Sans answers : évalue la section et retourne soit des questions ciblées, soit
// un texte proposé directement si le contenu actuel est déjà exploitable.
// Avec answers : génère le texte final à partir des réponses fournies.
router.post('/:id/sections/:sectionId/ai-assist', authMiddleware, requireFranchisor, async (req, res) => {
  const { answers } = req.body;

  const { data: ownerDip } = await supabaseAdmin
    .from('dip_documents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!ownerDip) return res.status(404).json({ error: 'DIP introuvable' });

  const { data: section } = await supabaseAdmin
    .from('dip_sections').select('*').eq('id', req.params.sectionId).eq('dip_id', req.params.id).single();
  if (!section) return res.status(404).json({ error: 'Section introuvable' });

  try {
    if (Array.isArray(answers) && answers.length > 0) {
      const result = await correctSectionWithAnswers(section, answers);
      return res.json({ needs_info: false, ...result });
    }
    const result = await correctSection(section);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/dip/check/:id
// POST /api/dip/create-from-agent — sauvegarde un DIP généré par l'agent IA
router.post('/create-from-agent', authMiddleware, requireFranchisor, async (req, res) => {
  const { sections, global_score, title, company_name } = req.body;

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return res.status(400).json({ error: 'sections requis (tableau non vide)' });
  }

  try {
    // Archiver le DIP actif existant s'il y en a un
    await supabaseAdmin
      .from('dip_documents')
      .update({ status: 'archive' })
      .eq('user_id', req.user.id)
      .eq('status', 'actif');

    const docTitle = title || `DIP ${company_name || 'Franchiseur'} — ${new Date().getFullYear()}`;

    const { data: dipDoc, error: dipError } = await supabaseAdmin
      .from('dip_documents')
      .insert({
        user_id: req.user.id,
        title: docTitle,
        file_url: null,
        status: 'actif',
        conformity_score: global_score ?? Math.round(
          (sections.filter(s => s.status === 'conforme').length / sections.length) * 100
        ),
        raw_text: sections.map(s => `=== ${s.section_title} ===\n${s.content}`).join('\n\n').substring(0, 50000)
      })
      .select()
      .single();

    if (dipError) throw new Error(dipError.message);

    const sectionsToInsert = sections.map(s => ({
      dip_id: dipDoc.id,
      section_number: s.section_number,
      section_title: s.section_title,
      content: s.content || '',
      status: s.status || 'a_verifier',
      last_checked: new Date().toISOString(),
      last_updated: new Date().toISOString()
    }));

    const { data: insertedSections, error: sectError } = await supabaseAdmin
      .from('dip_sections').insert(sectionsToInsert).select('id, section_title, content');
    if (sectError) throw new Error(sectError.message);

    // Alerte "contenu à compléter" — un DIP généré par l'IA depuis le
    // formulaire peut contenir des "Non renseigné — à compléter avant
    // remise" dès sa création (voir claude.js generateDIPFromForm) ; jusqu'ici
    // seule une édition manuelle ultérieure déclenchait cette vérification.
    const incompleteAlerts = buildIncompleteAlerts(insertedSections || [], {
      parentKey: 'dip_id', parentId: dipDoc.id, itemKey: 'section_id', titleField: 'section_title', docLabel: 'La section',
    });
    if (incompleteAlerts.length > 0) {
      await supabaseAdmin.from('alerts').insert(incompleteAlerts).then(({ error }) => { if (error) console.error('Incomplete-content alert error:', error.message); });
    }

    await supabaseAdmin.from('audit_log').insert({
      dip_id: dipDoc.id,
      action: 'generated_by_agent',
      user_id: req.user.id,
      new_content: JSON.stringify({ sections_count: sections.length, score: dipDoc.conformity_score }),
      timestamp: new Date().toISOString()
    });

    // Attestation INITIALE — l'upload d'un DIP en génère une (déclenchée par
    // le frontend), mais la génération par IA n'en produisait aucune : un DIP
    // créé de zéro n'avait pas de preuve horodatée de son état d'origine.
    createCertificate({
      userId: req.user.id, userEmail: req.user.email, dipId: dipDoc.id,
      certificateType: 'INITIAL', changes: [],
    }).catch(e => console.error('Certificate auto-gen error (create-from-agent):', e.message));

    res.status(201).json({
      dip: dipDoc,
      sections_count: sectionsToInsert.length,
      conformity_score: dipDoc.conformity_score
    });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

router.post('/check/:id', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  await supabaseAdmin.from('dip_sections')
    .update({ last_checked: new Date().toISOString() })
    .eq('dip_id', req.params.id);

  res.json({ message: 'Vérification lancée', checked_at: new Date().toISOString() });
});

// POST /api/dip/:id/share-link — génère un lien de partage pour les franchisés
router.post('/:id/share-link', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('id, share_token').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const token = dip.share_token || uuidv4();
  const { error } = await supabaseAdmin.from('dip_documents').update({
    share_token: token,
    share_token_created_at: new Date().toISOString()
  }).eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  const baseUrl = getAppUrl();
  res.json({ token, share_url: `${baseUrl}/dip/partage/${token}` });
});

// POST /api/dip/:id/litigation-risks — analyse les risques de litiges du DIP (Claude Opus)
router.post('/:id/litigation-risks', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    const { data: dip, error } = await supabaseAdmin
      .from('dip_documents')
      .select('id, title, dip_sections(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !dip) return res.status(404).json({ error: 'DIP introuvable' });

    const sections = (dip.dip_sections || []).sort((a, b) => a.section_number - b.section_number);
    if (sections.length === 0) {
      return res.status(400).json({ error: 'Ce DIP ne contient pas encore de sections analysées. Uploadez d\'abord votre document.' });
    }

    const result = await assessLitigationRisks(sections);
    res.json({ litigation_risks: result });
  } catch (err) {
    console.error('Litigation risks error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// DELETE /api/dip/:id/share-link — révoque le lien de partage
router.delete('/:id/share-link', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const { error } = await supabaseAdmin.from('dip_documents').update({
    share_token: null, share_token_created_at: null, share_token_views: 0
  }).eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Lien révoqué' });
});

module.exports = router;
