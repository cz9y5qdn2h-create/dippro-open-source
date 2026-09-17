const express = require('express');
const { getAppUrl } = require('../config/appUrl');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const { getActiveAvocatRelation } = require('../middleware/avocatScope');
const { parseContractClauses, compareContractVersions, generateContractFromDIP, generateContractFromDIPStream, correctClause, correctClauseWithAnswers } = require('../config/claude');
const { triggerCrossImpactAlerts } = require('../utils/crossImpact');
const { createCertificate } = require('./certificates');
const errMsg = require('../config/errorMessage');
const { stripRichTextMarkers } = require('../config/richTextStrip');
const { buildContractPdf } = require('../config/documentPdf');
const { findIncompleteMarker, buildIncompleteAlerts } = require('../config/incompleteContentCheck');
const router = express.Router();

const sha256hex = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const BUCKET = 'contract-files';

const { extractText } = require('../config/textExtract');

const ensureBucket = async () => {
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
};

// GET /api/contracts/upload-url
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

// POST /api/contracts/process — télécharge, extrait le texte, analyse avec Claude
router.post('/process', authMiddleware, requireFranchisor, async (req, res) => {
  const { storage_path, title, signed_url, linked_dip_id } = req.body;
  if (!storage_path) return res.status(400).json({ error: 'storage_path requis' });
  if (!storage_path.startsWith(`${req.user.id}/`)) {
    return res.status(403).json({ error: 'storage_path invalide' });
  }

  try {
    let buffer;

    const { data: fileBlob, error: dlError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(storage_path);

    if (!dlError && fileBlob) {
      const arrayBuffer = await fileBlob.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (signed_url) {
      const httpRes = await fetch(signed_url);
      if (!httpRes.ok) throw new Error('Impossible de récupérer le fichier (signed URL): ' + httpRes.status);
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

    const { data: existingContracts } = await supabaseAdmin
      .from('franchise_contracts')
      .select('id, raw_text, title, conformity_score, linked_dip_id')
      .eq('user_id', req.user.id)
      .eq('status', 'actif')
      .order('created_at', { ascending: false })
      .limit(1);

    const previousContract = existingContracts?.[0];

    // MODE COMPARAISON
    if (previousContract && previousContract.raw_text) {
      const comparison = await compareContractVersions(previousContract.raw_text, rawText);

      const { data: draftContract, error: draftError } = await supabaseAdmin
        .from('franchise_contracts')
        .insert({
          user_id:          req.user.id,
          linked_dip_id:    linked_dip_id || previousContract.linked_dip_id || null,
          title:            docTitle,
          file_url:         fileUrl,
          status:           'brouillon',
          conformity_score: previousContract.conformity_score,
          raw_text:         rawText.substring(0, 50000),
          sha256:           fileHash
        })
        .select()
        .single();

      if (draftError) throw new Error(draftError.message);

      await supabaseAdmin.from('audit_log').insert({
        contract_id: draftContract.id,
        action: 'upload_nouvelle_version_contrat',
        user_id: req.user.id,
        new_content: JSON.stringify({
          filename: path.basename(storage_path),
          nb_changements: comparison.changements?.length || 0,
          previous_contract_id: previousContract.id
        }),
        timestamp: new Date().toISOString()
      });

      // Tunnel : un changement de contrat substantiel peut impacter le DIP lié
      if (previousContract.linked_dip_id && comparison.changements?.length > 0) {
        await triggerCrossImpactAlerts({
          sourceType: 'contract',
          changes: comparison.changements,
          dipId: previousContract.linked_dip_id
        }).catch(err => console.error('Cross-impact (contract->dip) error:', err.message));
      }

      return res.json({
        mode:                    'comparison',
        draft_contract_id:       draftContract.id,
        previous_contract_id:    previousContract.id,
        sha256:                  fileHash,
        changements:             comparison.changements || [],
        resume:                  comparison.resume,
        nb_changements_critiques: comparison.nb_changements_critiques || 0
      });
    }

    // MODE INITIAL
    const parsed = await parseContractClauses(rawText);

    const { data: contractDoc, error: contractError } = await supabaseAdmin
      .from('franchise_contracts')
      .insert({
        user_id:          req.user.id,
        linked_dip_id:    linked_dip_id || null,
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

    if (contractError) throw new Error(contractError.message);

    const clausesToInsert = (parsed.clauses || []).map(c => ({
      contract_id:                 contractDoc.id,
      linked_dip_section_id:       null,
      clause_number:                c.clause_number,
      clause_title:                 c.clause_title,
      content:                     c.content,
      status:                      c.status || 'a_verifier',
      legal_blocking:              c.legal_blocking             || false,
      mandatory_elements_found:    c.mandatory_elements_found   || [],
      mandatory_elements_missing:  c.mandatory_elements_missing || [],
      last_checked:                new Date().toISOString(),
      last_updated:                new Date().toISOString()
    }));

    if (clausesToInsert.length > 0) {
      await supabaseAdmin.from('contract_clauses').insert(clausesToInsert);
    }

    await supabaseAdmin.from('audit_log').insert({
      contract_id: contractDoc.id,
      action: 'upload_initial_contrat',
      user_id: req.user.id,
      new_content: JSON.stringify({
        filename: path.basename(storage_path),
        score: parsed.global_score,
        clauses: clausesToInsert.length
      }),
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      mode:             'initial',
      contract:         contractDoc,
      sha256:           fileHash,
      clauses_count:    clausesToInsert.length,
      conformity_score: parsed.global_score,
      compliance_level: parsed.compliance_level,
      blocking_issues:  parsed.blocking_issues || [],
      summary:          parsed.summary
    });

  } catch (err) {
    console.error('Contract process error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/contracts/approve-changes
router.post('/approve-changes', authMiddleware, requireFranchisor, async (req, res) => {
  const { draft_contract_id, previous_contract_id, approved_changes } = req.body;
  if (!draft_contract_id || !previous_contract_id) {
    return res.status(400).json({ error: 'draft_contract_id et previous_contract_id requis' });
  }

  try {
    const { data: prevContract } = await supabaseAdmin
      .from('franchise_contracts').select('id').eq('id', previous_contract_id).eq('user_id', req.user.id).single();
    if (!prevContract) return res.status(403).json({ error: 'Contrat précédent introuvable' });

    await supabaseAdmin
      .from('franchise_contracts')
      .update({ status: 'archive' })
      .eq('id', previous_contract_id)
      .eq('user_id', req.user.id);

    const { data: newContract, error: activateError } = await supabaseAdmin
      .from('franchise_contracts')
      .update({ status: 'actif' })
      .eq('id', draft_contract_id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (activateError) throw new Error(activateError.message);

    const { data: previousClauses } = await supabaseAdmin
      .from('contract_clauses')
      .select('*')
      .eq('contract_id', previous_contract_id)
      .order('clause_number');

    if (previousClauses?.length > 0) {
      const newClauses = previousClauses.map(c => ({
        contract_id: draft_contract_id,
        linked_dip_section_id: c.linked_dip_section_id,
        clause_number: c.clause_number,
        clause_title: c.clause_title,
        content: c.content,
        status: c.status,
        last_checked: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }));

      if (approved_changes?.length > 0) {
        approved_changes.forEach(change => {
          const clause = newClauses.find(c => c.clause_number === change.clause_number);
          if (clause && change.nouveau) {
            clause.content = change.nouveau;
            clause.status = 'a_verifier';
            clause.last_updated = new Date().toISOString();
          }
        });
      }

      await supabaseAdmin.from('contract_clauses').insert(newClauses);

      const conformeCount = newClauses.filter(c => c.status === 'conforme').length;
      const score = Math.round((conformeCount / newClauses.length) * 100);
      await supabaseAdmin.from('franchise_contracts').update({ conformity_score: score }).eq('id', draft_contract_id);
    }

    await supabaseAdmin.from('audit_log').insert({
      contract_id: draft_contract_id,
      action: 'contract_version_approved',
      user_id: req.user.id,
      new_content: JSON.stringify({ nb_changes_approved: approved_changes?.length || 0, previous_contract_id }),
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Nouvelle version du contrat activée', contract: newContract });
  } catch (err) {
    console.error('Approve contract changes error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/contracts/generate — génère un contrat avec l'IA à partir d'un DIP existant
router.post('/generate', authMiddleware, requireFranchisor, async (req, res) => {
  const { dip_id, formData } = req.body;
  if (!dip_id) return res.status(400).json({ error: 'dip_id requis' });

  try {
    const { data: dip, error: dipError } = await supabaseAdmin
      .from('dip_documents')
      .select('id, title, dip_sections(*)')
      .eq('id', dip_id)
      .eq('user_id', req.user.id)
      .single();

    if (dipError || !dip) return res.status(404).json({ error: 'DIP introuvable' });
    if (!dip.dip_sections || dip.dip_sections.length === 0) {
      return res.status(400).json({ error: 'Ce DIP ne contient aucune section analysée' });
    }

    const result = await generateContractFromDIP(dip.dip_sections, formData || {});
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Contract generate error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/contracts/generate-stream — génère un contrat via SSE (streaming) pour éviter le timeout Vercel
router.post('/generate-stream', authMiddleware, requireFranchisor, async (req, res) => {
  const { dip_id, formData } = req.body;
  if (!dip_id) return res.status(400).json({ error: 'dip_id requis' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (obj) => {
    try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch {}
  };

  try {
    send({ type: 'progress', step: 'Chargement du DIP…', pct: 5 });

    const { data: dip, error: dipError } = await supabaseAdmin
      .from('dip_documents')
      .select('id, title, dip_sections(*)')
      .eq('id', dip_id)
      .eq('user_id', req.user.id)
      .single();

    if (dipError || !dip) {
      send({ type: 'error', error: 'DIP introuvable' });
      return res.end();
    }
    if (!dip.dip_sections?.length) {
      send({ type: 'error', error: 'Ce DIP ne contient aucune section analysée' });
      return res.end();
    }

    send({ type: 'progress', step: 'Démarrage de la rédaction par Claude…', pct: 10 });

    const result = await generateContractFromDIPStream(
      dip.dip_sections,
      formData || {},
      (pct, step) => send({ type: 'progress', step, pct })
    );

    send({ type: 'done', result });
    res.end();
  } catch (err) {
    console.error('Contract generate-stream error:', err.message);
    send({ type: 'error', error: errMsg(err) });
    res.end();
  }
});

// POST /api/contracts/create-from-agent — sauvegarde un contrat généré par l'agent IA
router.post('/create-from-agent', authMiddleware, requireFranchisor, async (req, res) => {
  const { clauses, global_score, title, dip_id } = req.body;

  if (!clauses || !Array.isArray(clauses) || clauses.length === 0) {
    return res.status(400).json({ error: 'clauses requis (tableau non vide)' });
  }

  try {
    await supabaseAdmin
      .from('franchise_contracts')
      .update({ status: 'archive' })
      .eq('user_id', req.user.id)
      .eq('status', 'actif');

    const docTitle = title || `Contrat de franchise — ${new Date().getFullYear()}`;

    const { data: contractDoc, error: contractError } = await supabaseAdmin
      .from('franchise_contracts')
      .insert({
        user_id: req.user.id,
        linked_dip_id: dip_id || null,
        title: docTitle,
        file_url: null,
        status: 'actif',
        conformity_score: global_score ?? Math.round(
          (clauses.filter(c => c.status === 'conforme').length / clauses.length) * 100
        ),
        raw_text: clauses.map(c => `=== ${c.clause_title} ===\n${c.content}`).join('\n\n').substring(0, 50000)
      })
      .select()
      .single();

    if (contractError) throw new Error(contractError.message);

    const clausesToInsert = clauses.map(c => ({
      contract_id: contractDoc.id,
      linked_dip_section_id: null,
      clause_number: c.clause_number,
      clause_title: c.clause_title,
      content: c.content || '',
      status: c.status || 'a_verifier',
      legal_blocking: c.legal_blocking || false,
      mandatory_elements_found: c.mandatory_elements_found || [],
      mandatory_elements_missing: c.mandatory_elements_missing || [],
      last_checked: new Date().toISOString(),
      last_updated: new Date().toISOString()
    }));

    const { data: insertedClauses, error: clauseError } = await supabaseAdmin
      .from('contract_clauses').insert(clausesToInsert).select('id, clause_title, content');
    if (clauseError) throw new Error(clauseError.message);

    // Alerte "contenu à compléter" — même correctif que sur dip.js
    // create-from-agent : un contrat généré par l'IA peut contenir des
    // placeholders dès sa création, pas seulement après édition manuelle.
    const incompleteAlerts = buildIncompleteAlerts(insertedClauses || [], {
      parentKey: 'contract_id', parentId: contractDoc.id, itemKey: 'clause_id', titleField: 'clause_title', docLabel: 'La clause',
    });
    if (incompleteAlerts.length > 0) {
      await supabaseAdmin.from('alerts').insert(incompleteAlerts).then(({ error }) => { if (error) console.error('Incomplete-content alert error:', error.message); });
    }

    await supabaseAdmin.from('audit_log').insert({
      contract_id: contractDoc.id,
      action: 'generated_by_agent',
      user_id: req.user.id,
      new_content: JSON.stringify({ clauses_count: clauses.length, score: contractDoc.conformity_score, dip_id: dip_id || null }),
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      contract: contractDoc,
      clauses_count: clausesToInsert.length,
      conformity_score: contractDoc.conformity_score
    });
  } catch (err) {
    console.error('Contract create-from-agent error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// GET /api/contracts
router.get('/', authMiddleware, async (req, res) => {
  let query = supabaseAdmin
    .from('franchise_contracts')
    .select('*, contract_clauses(*)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (req.query.all !== 'true') {
    query = query.eq('status', 'actif');
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: errMsg(error) });
  res.json({ contracts: data || [] });
});

// GET /api/contracts/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('franchise_contracts')
    .select('*, contract_clauses(*)')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Contrat introuvable' });
  res.json({ contract: data });
});

// GET /api/contracts/:id/pdf — le contrat en document classique (conventionnel)
router.get('/:id/pdf', authMiddleware, async (req, res) => {
  const { data: contract, error } = await supabaseAdmin
    .from('franchise_contracts')
    .select('*, contract_clauses(*)')
    .eq('id', req.params.id)
    .single();
  if (error || !contract) return res.status(404).json({ error: 'Contrat introuvable' });

  // Accessible au propriétaire, ou à un avocat ayant une relation active
  // avec ce franchiseur (portail avocat — export en lecture seule).
  if (contract.user_id !== req.user.id) {
    const { data: relation } = await supabaseAdmin
      .from('avocat_franchiseurs').select('status')
      .eq('avocat_id', req.user.id).eq('franchiseur_id', contract.user_id).maybeSingle();
    if (relation?.status !== 'active') return res.status(404).json({ error: 'Contrat introuvable' });
  }

  const { data: user } = await supabaseAdmin.from('users')
    .select('company_name, siret, email').eq('id', contract.user_id).single();

  const safe = (user?.company_name || 'contrat').replace(/[^a-z0-9]/gi, '_').substring(0, 40);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Contrat-franchise-${safe}.pdf"`);
  buildContractPdf(contract, user).pipe(res);
});

// POST /api/contracts/:id/link-dip — relie le contrat à un DIP existant (tunnel)
router.post('/:id/link-dip', authMiddleware, requireFranchisor, async (req, res) => {
  const { dip_id } = req.body;
  if (!dip_id) return res.status(400).json({ error: 'dip_id requis' });

  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('id').eq('id', dip_id).eq('user_id', req.user.id).single();
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const { data, error } = await supabaseAdmin
    .from('franchise_contracts')
    .update({ linked_dip_id: dip_id, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Contrat introuvable' });
  res.json({ contract: data });
});

// PUT /api/contracts/:id/clauses/:clauseId
router.put('/:id/clauses/:clauseId', authMiddleware, requireFranchisor, async (req, res) => {
  const { content, status } = req.body;

  const { data: ownerContract } = await supabaseAdmin
    .from('franchise_contracts').select('id, linked_dip_id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!ownerContract) return res.status(404).json({ error: 'Contrat introuvable' });

  const { data: existing } = await supabaseAdmin
    .from('contract_clauses').select('*').eq('id', req.params.clauseId).eq('contract_id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Clause introuvable' });

  await supabaseAdmin.from('audit_log').insert({
    contract_id: req.params.id,
    clause_id: req.params.clauseId,
    action: 'clause_update',
    old_content: existing.content,
    new_content: content,
    user_id: req.user.id,
    timestamp: new Date().toISOString()
  });

  const contentChanged = existing.content !== content;
  const avocatRelation = contentChanged ? await getActiveAvocatRelation(req.user.id) : null;

  const { data, error } = await supabaseAdmin
    .from('contract_clauses')
    .update({
      content, status, last_updated: new Date().toISOString(),
      ...(avocatRelation ? {
        avocat_validation_status: 'pending',
        avocat_validated_by: null,
        avocat_validated_at: null,
        avocat_validation_comment: null,
      } : {}),
    })
    .eq('id', req.params.clauseId)
    .select().single();

  if (error) return res.status(500).json({ error: errMsg(error) });

  const { data: allClauses } = await supabaseAdmin
    .from('contract_clauses').select('status').eq('contract_id', req.params.id);
  const conformeCount = (allClauses || []).filter(c => c.status === 'conforme').length;
  const score = allClauses?.length ? Math.round((conformeCount / allClauses.length) * 100) : 0;
  await supabaseAdmin.from('franchise_contracts').update({ conformity_score: score }).eq('id', req.params.id);

  // Attestation de mise à jour — l'édition directe d'une clause modifie le
  // contrat lié au DIP ; quand un DIP est lié, on trace la modification par
  // un certificat comme pour les sections DIP. Non-bloquant.
  if (existing.content !== content && ownerContract.linked_dip_id) {
    createCertificate({
      userId: req.user.id, userEmail: req.user.email, dipId: ownerContract.linked_dip_id,
      certificateType: 'MISE_A_JOUR',
      changes: [{
        id: req.params.clauseId,
        type: 'modification_clause',
        section: existing.clause_title,
        section_number: existing.clause_number,
        ancien: existing.content || '',
        nouveau: content || '',
        impact_legal: 'Moderate',
        recommandation_ia: 'Modification directe d\'une clause du contrat par le franchiseur — vérifier la cohérence avec le DIP lié.',
      }],
    }).catch(e => console.error('Certificate auto-gen error (clause update):', e.message));
  }

  // Alerte "contenu à compléter" — même correctif que sur les sections DIP
  // (dip.js) : signale un placeholder "[À COMPLÉTER : ...]" resté dans le
  // texte sauvegardé plutôt que de le laisser passer silencieusement.
  const incompleteMarker = findIncompleteMarker(content);
  if (incompleteMarker) {
    await supabaseAdmin.from('alerts').insert({
      contract_id: req.params.id,
      clause_id: req.params.clauseId,
      source: 'Contenu à compléter',
      suggestion: `La clause « ${existing.clause_title} » contient un passage non finalisé : « ${incompleteMarker} ». Complétez-le avant la signature du contrat.`,
      urgency: 'haute',
      status: 'pending',
    }).then(({ error }) => { if (error) console.error('Incomplete-content alert error:', error.message); });
  }

  res.json({ clause: data, conformity_score: score });
});

// POST /api/contracts/:id/signature — case signature du document (contrat)
router.post('/:id/signature', authMiddleware, requireFranchisor, async (req, res) => {
  const { signature_image, signed_by } = req.body;
  if (!signature_image?.trim() || !signed_by?.trim()) {
    return res.status(400).json({ error: 'signature_image et signed_by requis' });
  }

  const { data: ownerContract } = await supabaseAdmin
    .from('franchise_contracts').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!ownerContract) return res.status(404).json({ error: 'Contrat introuvable' });

  const { data, error } = await supabaseAdmin
    .from('franchise_contracts')
    .update({ signature_image, signed_by: signed_by.trim().substring(0, 200), signed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('id, signature_image, signed_by, signed_at').single();

  if (error) return res.status(500).json({ error: errMsg(error) });
  res.json({ contract: data });
});

// DELETE /api/contracts/:id/signature — réinitialise la signature
router.delete('/:id/signature', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: ownerContract } = await supabaseAdmin
    .from('franchise_contracts').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!ownerContract) return res.status(404).json({ error: 'Contrat introuvable' });

  const { error } = await supabaseAdmin
    .from('franchise_contracts')
    .update({ signature_image: null, signed_by: null, signed_at: null })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: errMsg(error) });
  res.json({ success: true });
});

// POST /api/contracts/:id/clauses/:clauseId/ai-assist — widget "Aide à la rédaction"
router.post('/:id/clauses/:clauseId/ai-assist', authMiddleware, requireFranchisor, async (req, res) => {
  const { answers } = req.body;

  const { data: ownerContract } = await supabaseAdmin
    .from('franchise_contracts').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!ownerContract) return res.status(404).json({ error: 'Contrat introuvable' });

  const { data: clause } = await supabaseAdmin
    .from('contract_clauses').select('*').eq('id', req.params.clauseId).eq('contract_id', req.params.id).single();
  if (!clause) return res.status(404).json({ error: 'Clause introuvable' });

  try {
    if (Array.isArray(answers) && answers.length > 0) {
      const result = await correctClauseWithAnswers(clause, answers);
      return res.json({ needs_info: false, ...result });
    }
    const result = await correctClause(clause);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// POST /api/contracts/:id/share-link
router.post('/:id/share-link', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: contract } = await supabaseAdmin
    .from('franchise_contracts').select('id, share_token').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });

  const token = contract.share_token || uuidv4();
  const { error } = await supabaseAdmin.from('franchise_contracts').update({
    share_token: token,
    share_token_created_at: new Date().toISOString()
  }).eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  const baseUrl = getAppUrl();
  res.json({ token, share_url: `${baseUrl}/contrat/partage/${token}` });
});

// DELETE /api/contracts/:id/share-link
router.delete('/:id/share-link', authMiddleware, requireFranchisor, async (req, res) => {
  const { data: contract } = await supabaseAdmin
    .from('franchise_contracts').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });

  const { error } = await supabaseAdmin.from('franchise_contracts').update({
    share_token: null, share_token_created_at: null, share_token_views: 0
  }).eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Lien révoqué' });
});

// GET /api/contracts/shared/:token — public
router.get('/shared/:token', async (req, res) => {
  const token = req.params.token;
  if (!token || token.length > 100) return res.status(400).json({ error: 'Token invalide' });

  const { data: contract, error } = await supabaseAdmin
    .from('franchise_contracts')
    .select('id, title, conformity_score, status, created_at, share_token_views, contract_clauses(*)')
    .eq('share_token', token)
    .single();

  if (error || !contract) return res.status(404).json({ error: 'Contrat introuvable ou lien expiré' });

  await supabaseAdmin.from('franchise_contracts')
    .update({ share_token_views: (contract.share_token_views || 0) + 1 })
    .eq('id', contract.id);

  const clauses = (contract.contract_clauses || [])
    .sort((a, b) => a.clause_number - b.clause_number)
    .map(c => ({
      id: c.id,
      clause_number: c.clause_number,
      clause_title: c.clause_title,
      content: c.content,
      status: c.status,
      last_updated: c.last_updated
    }));

  res.json({
    contract: {
      id: contract.id,
      title: contract.title,
      conformity_score: contract.conformity_score,
      created_at: contract.created_at,
      clauses
    }
  });
});

module.exports = router;
