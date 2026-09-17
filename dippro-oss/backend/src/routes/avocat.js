const express = require('express');
const rateLimit = require('express-rate-limit');
const { getAppUrl } = require('../config/appUrl');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { createCertificate } = require('./certificates');
const { computeLiveCompliance } = require('./compliance');
const { answerComplianceQuestion } = require('../config/claude');
const { buildDipDocumentPdf, buildContractPdf, pdfDocToBuffer } = require('../config/documentPdf');
const errMsg = require('../config/errorMessage');
const router = express.Router();

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Envoi du document fini à un destinataire choisi par l'avocat — distinct du
// rate-limit global, un envoi joint un PDF généré à la volée (coûteux) et
// part vers une adresse externe.
const sendDocLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop d'envois. Réessayez dans une heure." },
});

// Appel IA coûteux (Opus + thinking) — limite dédiée distincte du rate-limit
// global, sur le modèle de agentLimiter côté serveur.
const complianceSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de recherches. Réessayez dans quelques minutes.' },
});

// Provisionne un compte Supabase (si nécessaire) et envoie un email réel à
// chaque appel — sans limite dédiée, un compte franchiseur compromis ou un
// script pourrait spammer une adresse email ou générer des comptes en boucle
// via le seul rate-limit global (300 req/15min, partagé avec tout /api/*).
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop d'invitations envoyées. Réessayez dans une heure." },
});

const requireAvocat = async (req, res, next) => {
  const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', req.user.id).single();
  if (profile?.role !== 'avocat') return res.status(403).json({ error: 'Réservé aux avocats' });
  next();
};

// GET /api/avocat/dashboard
router.get('/dashboard', authMiddleware, requireAvocat, async (req, res) => {
  const { data: relations } = await supabaseAdmin
    .from('avocat_franchiseurs')
    .select('id, status, invited_at, accepted_at, franchiseur_id, validation_mode')
    .eq('avocat_id', req.user.id)
    .order('invited_at', { ascending: false });

  if (!relations?.length) return res.json({ franchiseurs: [], pending: [], average_compliance_score: null });

  const franchiseurIds = relations.map(r => r.franchiseur_id);

  const [{ data: users }, { data: dips }] = await Promise.all([
    supabaseAdmin.from('users').select('id, company_name, email, siret').in('id', franchiseurIds),
    supabaseAdmin.from('dip_documents')
      .select('id, title, status, upload_date, user_id, dip_sections(status, legal_blocking, avocat_validation_status)')
      .in('user_id', franchiseurIds).eq('status', 'actif')
      .order('upload_date', { ascending: false }),
  ]);

  const dipByUser = {};
  (dips || []).forEach(d => { if (!dipByUser[d.user_id]) dipByUser[d.user_id] = d; });

  const userById = {};
  (users || []).forEach(u => { userById[u.id] = u; });

  const modeByFranchiseur = {};
  relations.forEach(r => { modeByFranchiseur[r.franchiseur_id] = r.validation_mode; });

  const enriched = relations.map(r => {
    const latestDip = dipByUser[r.franchiseur_id] || null;
    const compliance = latestDip
      ? computeLiveCompliance(latestDip.dip_sections, { strictPending: r.validation_mode === 'strict' })
      : null;
    return {
      ...r,
      franchiseur: userById[r.franchiseur_id] || { id: r.franchiseur_id },
      latestDip: latestDip ? { id: latestDip.id, title: latestDip.title, status: latestDip.status, upload_date: latestDip.upload_date, ...compliance } : null,
    };
  });

  const active = enriched.filter(r => r.status === 'active');
  const scored = active.map(r => r.latestDip?.conformity_score).filter(s => typeof s === 'number');
  const averageScore = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

  res.json({
    franchiseurs: active,
    pending: enriched.filter(r => r.status === 'pending'),
    average_compliance_score: averageScore,
  });
});

// PATCH /api/avocat/franchiseur/:franchiseurId/validation-mode — l'avocat
// choisit, par client, si ses modifications directes doivent rester en
// attente de sa confirmation ('strict') ou juste le notifier ('alerte').
router.patch('/franchiseur/:franchiseurId/validation-mode', authMiddleware, requireAvocat, async (req, res) => {
  const { validation_mode } = req.body;
  if (!['strict', 'alerte'].includes(validation_mode)) {
    return res.status(400).json({ error: 'validation_mode doit être "strict" ou "alerte"' });
  }
  const { data, error } = await supabaseAdmin
    .from('avocat_franchiseurs')
    .update({ validation_mode })
    .eq('avocat_id', req.user.id)
    .eq('franchiseur_id', req.params.franchiseurId)
    .eq('status', 'active')
    .select('id, franchiseur_id, validation_mode').maybeSingle();
  if (error) return res.status(500).json({ error: errMsg(error) });
  if (!data) return res.status(404).json({ error: 'Relation introuvable' });
  res.json({ relation: data });
});

// GET /api/avocat/automation-settings — fréquence et canal du compte-rendu programmé
router.get('/automation-settings', authMiddleware, requireAvocat, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('avocat_digest_frequency, avocat_digest_channel, avocat_digest_last_sent_at')
    .eq('id', req.user.id).single();
  if (error) return res.status(500).json({ error: errMsg(error) });
  res.json({ settings: data });
});

// PATCH /api/avocat/automation-settings
router.patch('/automation-settings', authMiddleware, requireAvocat, async (req, res) => {
  const { frequency, channel } = req.body;
  if (!['off', 'weekly', 'daily'].includes(frequency)) {
    return res.status(400).json({ error: 'frequency doit être "off", "weekly" ou "daily"' });
  }
  if (!['email', 'inapp', 'both'].includes(channel)) {
    return res.status(400).json({ error: 'channel doit être "email", "inapp" ou "both"' });
  }
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ avocat_digest_frequency: frequency, avocat_digest_channel: channel })
    .eq('id', req.user.id)
    .select('avocat_digest_frequency, avocat_digest_channel, avocat_digest_last_sent_at').single();
  if (error) return res.status(500).json({ error: errMsg(error) });
  res.json({ settings: data });
});

// GET /api/avocat/digests — historique des comptes-rendus déjà générés
router.get('/digests', authMiddleware, requireAvocat, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('avocat_digests')
    .select('id, generated_at, franchiseur_count, average_score, summary')
    .eq('avocat_id', req.user.id)
    .order('generated_at', { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ error: errMsg(error) });
  res.json({ digests: data || [] });
});

// GET /api/avocat/franchiseur/:franchiseurId/dip — DIP d'un franchiseur pour cet avocat
router.get('/franchiseur/:franchiseurId/dip', authMiddleware, requireAvocat, async (req, res) => {
  const { franchiseurId } = req.params;

  const { data: relation } = await supabaseAdmin
    .from('avocat_franchiseurs').select('status')
    .eq('avocat_id', req.user.id).eq('franchiseur_id', franchiseurId).maybeSingle();

  if (relation?.status !== 'active') return res.status(403).json({ error: 'Relation inactive ou inexistante' });

  const { data: dips } = await supabaseAdmin
    .from('dip_documents').select('*, dip_sections(*)')
    .eq('user_id', franchiseurId).eq('status', 'actif').limit(1);

  const dip = dips?.[0] || null;

  const { data: franchiseur } = await supabaseAdmin
    .from('users').select('id, company_name, email').eq('id', franchiseurId).single();

  let proposals = [];
  if (dip) {
    const { data } = await supabaseAdmin
      .from('dip_section_proposals').select('*')
      .eq('dip_id', dip.id).eq('proposed_by', req.user.id)
      .order('created_at', { ascending: false });
    proposals = data || [];

    // Annexes du DIP entier — énumérées à la fin du document, dans l'ordre
    // d'ajout (migration 048 : plus de rattachement par section).
    const { data: annexes } = await supabaseAdmin
      .from('dip_section_annexes').select('id, file_name, size_bytes, position, created_at')
      .eq('dip_id', dip.id).order('position', { ascending: true });
    dip.annexes = annexes || [];
  }

  res.json({ dip, franchiseur, proposals });
});

// POST /api/avocat/compliance-search — moteur de recherche conformité, question
// libre avec le DIP du client actuellement consulté comme contexte optionnel.
router.post('/compliance-search', authMiddleware, requireAvocat, complianceSearchLimiter, async (req, res) => {
  const { question, franchiseur_id } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question requise' });
  if (question.length > 2000) return res.status(400).json({ error: 'Question trop longue (2000 caractères max)' });

  let dipContext = null;
  if (franchiseur_id) {
    const { data: relation } = await supabaseAdmin
      .from('avocat_franchiseurs').select('status')
      .eq('avocat_id', req.user.id).eq('franchiseur_id', franchiseur_id).maybeSingle();
    if (relation?.status !== 'active') return res.status(403).json({ error: 'Relation inactive ou inexistante' });

    const { data: dips } = await supabaseAdmin
      .from('dip_documents').select('id, dip_sections(section_number, section_title, content)')
      .eq('user_id', franchiseur_id).eq('status', 'actif').limit(1);
    dipContext = dips?.[0]?.dip_sections || null;
  }

  try {
    const answer = await answerComplianceQuestion(question.trim(), dipContext);
    res.json({ answer });
  } catch (err) {
    console.error('Compliance search error:', err.message);
    res.status(500).json({ error: errMsg(err) });
  }
});

// GET /api/avocat/franchiseur/:franchiseurId/contract — contrat d'un franchiseur pour cet avocat
router.get('/franchiseur/:franchiseurId/contract', authMiddleware, requireAvocat, async (req, res) => {
  const { franchiseurId } = req.params;

  const { data: relation } = await supabaseAdmin
    .from('avocat_franchiseurs').select('status')
    .eq('avocat_id', req.user.id).eq('franchiseur_id', franchiseurId).maybeSingle();

  if (relation?.status !== 'active') return res.status(403).json({ error: 'Relation inactive ou inexistante' });

  const { data: contracts } = await supabaseAdmin
    .from('franchise_contracts').select('*, contract_clauses(*)')
    .eq('user_id', franchiseurId).eq('status', 'actif').limit(1);

  const contract = contracts?.[0] || null;

  const { data: franchiseur } = await supabaseAdmin
    .from('users').select('id, company_name, email').eq('id', franchiseurId).single();

  let proposals = [];
  if (contract) {
    const { data } = await supabaseAdmin
      .from('contract_clause_proposals').select('*')
      .eq('contract_id', contract.id).eq('proposed_by', req.user.id)
      .order('created_at', { ascending: false });
    proposals = data || [];
  }

  res.json({ contract, franchiseur, proposals });
});

// POST /api/avocat/sections/:sectionId/propose — proposer une modification
router.post('/sections/:sectionId/propose', authMiddleware, requireAvocat, async (req, res) => {
  const { content, dip_id } = req.body;
  if (!content?.trim() || !dip_id) return res.status(400).json({ error: 'content et dip_id requis' });

  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('user_id').eq('id', dip_id).maybeSingle();
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const { data: relation } = await supabaseAdmin
    .from('avocat_franchiseurs').select('status')
    .eq('avocat_id', req.user.id).eq('franchiseur_id', dip.user_id).maybeSingle();

  if (relation?.status !== 'active') return res.status(403).json({ error: 'Relation inactive' });

  const { data: section } = await supabaseAdmin
    .from('dip_sections').select('content').eq('id', req.params.sectionId).eq('dip_id', dip_id).maybeSingle();

  const { data: proposal, error } = await supabaseAdmin
    .from('dip_section_proposals')
    .insert({
      section_id: req.params.sectionId,
      dip_id,
      proposed_by: req.user.id,
      content_proposed: content.trim(),
      content_before: section?.content || null,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ proposal });
});

// GET /api/avocat/dip/:dipId/proposals — propositions sur un DIP (franchiseur ou avocat)
router.get('/dip/:dipId/proposals', authMiddleware, async (req, res) => {
  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('user_id').eq('id', req.params.dipId).maybeSingle();
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const isOwner = dip.user_id === req.user.id;
  if (!isOwner) {
    const { data: rel } = await supabaseAdmin
      .from('avocat_franchiseurs').select('status')
      .eq('avocat_id', req.user.id).eq('franchiseur_id', dip.user_id).maybeSingle();
    if (rel?.status !== 'active') return res.status(403).json({ error: 'Accès refusé' });
  }

  const { data: proposals } = await supabaseAdmin
    .from('dip_section_proposals')
    .select('*, proposer:users!proposed_by(id, company_name, email, role)')
    .eq('dip_id', req.params.dipId)
    .order('created_at', { ascending: false });

  res.json({ proposals: proposals || [] });
});

// PUT /api/avocat/proposals/:id/accept — franchiseur accepte la proposition
router.put('/proposals/:id/accept', authMiddleware, async (req, res) => {
  const { reviewer_comment } = req.body;

  const { data: proposal } = await supabaseAdmin
    .from('dip_section_proposals').select('*').eq('id', req.params.id).maybeSingle();
  if (!proposal) return res.status(404).json({ error: 'Proposition introuvable' });
  if (proposal.status !== 'pending') return res.status(400).json({ error: 'Proposition déjà traitée' });

  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('user_id').eq('id', proposal.dip_id).single();
  if (dip?.user_id !== req.user.id) return res.status(403).json({ error: 'Seul le franchiseur peut valider' });

  const { data: section } = await supabaseAdmin
    .from('dip_sections').select('section_title, section_number').eq('id', proposal.section_id).maybeSingle();

  const now = new Date().toISOString();

  await Promise.all([
    supabaseAdmin.from('dip_sections').update({
      content: proposal.content_proposed,
      last_edited_by: proposal.proposed_by,
      last_edited_at: now,
    }).eq('id', proposal.section_id),

    supabaseAdmin.from('dip_section_proposals').update({
      status: 'accepted',
      reviewer_id: req.user.id,
      reviewed_at: now,
      reviewer_comment: reviewer_comment || null,
    }).eq('id', req.params.id),
  ]);

  // Même correctif que pour l'édition directe (dip.js) : une proposition
  // d'avocat acceptée est une modification du DIP comme une autre, elle doit
  // générer une attestation et notifier les franchisés.
  createCertificate({
    userId: req.user.id,
    userEmail: req.user.email,
    dipId: proposal.dip_id,
    certificateType: 'MISE_A_JOUR',
    changes: [{
      id: proposal.section_id,
      type: 'proposition_avocat_acceptee',
      section: section?.section_title || 'Section',
      section_number: section?.section_number,
      ancien: proposal.content_before || '',
      nouveau: proposal.content_proposed || '',
      impact_legal: 'Moderate',
      recommandation_ia: 'Modification proposée par l\'avocat et validée par le franchiseur.',
    }],
  }).catch(e => console.error('Certificate auto-gen error (proposal accept):', e.message));

  res.json({ ok: true });
});

// PUT /api/avocat/proposals/:id/reject — franchiseur rejette la proposition
router.put('/proposals/:id/reject', authMiddleware, async (req, res) => {
  const { reviewer_comment } = req.body;

  const { data: proposal } = await supabaseAdmin
    .from('dip_section_proposals').select('dip_id, status').eq('id', req.params.id).maybeSingle();
  if (!proposal) return res.status(404).json({ error: 'Proposition introuvable' });
  if (proposal.status !== 'pending') return res.status(400).json({ error: 'Proposition déjà traitée' });

  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('user_id').eq('id', proposal.dip_id).single();
  if (dip?.user_id !== req.user.id) return res.status(403).json({ error: 'Seul le franchiseur peut rejeter' });

  await supabaseAdmin.from('dip_section_proposals').update({
    status: 'rejected',
    reviewer_id: req.user.id,
    reviewed_at: new Date().toISOString(),
    reviewer_comment: reviewer_comment || null,
  }).eq('id', req.params.id);

  res.json({ ok: true });
});

// POST /api/avocat/clauses/:clauseId/propose — proposer une modification de clause
router.post('/clauses/:clauseId/propose', authMiddleware, requireAvocat, async (req, res) => {
  const { content, contract_id } = req.body;
  if (!content?.trim() || !contract_id) return res.status(400).json({ error: 'content et contract_id requis' });

  const { data: contract } = await supabaseAdmin
    .from('franchise_contracts').select('user_id').eq('id', contract_id).maybeSingle();
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });

  const { data: relation } = await supabaseAdmin
    .from('avocat_franchiseurs').select('status')
    .eq('avocat_id', req.user.id).eq('franchiseur_id', contract.user_id).maybeSingle();

  if (relation?.status !== 'active') return res.status(403).json({ error: 'Relation inactive' });

  const { data: clause } = await supabaseAdmin
    .from('contract_clauses').select('content').eq('id', req.params.clauseId).eq('contract_id', contract_id).maybeSingle();

  const { data: proposal, error } = await supabaseAdmin
    .from('contract_clause_proposals')
    .insert({
      clause_id: req.params.clauseId,
      contract_id,
      proposed_by: req.user.id,
      content_proposed: content.trim(),
      content_before: clause?.content || null,
    })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ proposal });
});

// GET /api/avocat/contract/:contractId/proposals — propositions sur un contrat (franchiseur ou avocat)
router.get('/contract/:contractId/proposals', authMiddleware, async (req, res) => {
  const { data: contract } = await supabaseAdmin
    .from('franchise_contracts').select('user_id').eq('id', req.params.contractId).maybeSingle();
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });

  const isOwner = contract.user_id === req.user.id;
  if (!isOwner) {
    const { data: rel } = await supabaseAdmin
      .from('avocat_franchiseurs').select('status')
      .eq('avocat_id', req.user.id).eq('franchiseur_id', contract.user_id).maybeSingle();
    if (rel?.status !== 'active') return res.status(403).json({ error: 'Accès refusé' });
  }

  const { data: proposals } = await supabaseAdmin
    .from('contract_clause_proposals')
    .select('*, proposer:users!proposed_by(id, company_name, email, role)')
    .eq('contract_id', req.params.contractId)
    .order('created_at', { ascending: false });

  res.json({ proposals: proposals || [] });
});

// PUT /api/avocat/clause-proposals/:id/accept — franchiseur accepte la proposition
router.put('/clause-proposals/:id/accept', authMiddleware, async (req, res) => {
  const { reviewer_comment } = req.body;

  const { data: proposal } = await supabaseAdmin
    .from('contract_clause_proposals').select('*').eq('id', req.params.id).maybeSingle();
  if (!proposal) return res.status(404).json({ error: 'Proposition introuvable' });
  if (proposal.status !== 'pending') return res.status(400).json({ error: 'Proposition déjà traitée' });

  const { data: contract } = await supabaseAdmin
    .from('franchise_contracts').select('user_id, linked_dip_id').eq('id', proposal.contract_id).single();
  if (contract?.user_id !== req.user.id) return res.status(403).json({ error: 'Seul le franchiseur peut valider' });

  const { data: clauseBefore } = await supabaseAdmin
    .from('contract_clauses').select('clause_title, clause_number, content').eq('id', proposal.clause_id).single();

  const now = new Date().toISOString();

  await Promise.all([
    supabaseAdmin.from('contract_clauses').update({
      content: proposal.content_proposed,
      last_edited_by: proposal.proposed_by,
      last_edited_at: now,
    }).eq('id', proposal.clause_id),

    supabaseAdmin.from('contract_clause_proposals').update({
      status: 'accepted',
      reviewer_id: req.user.id,
      reviewed_at: now,
      reviewer_comment: reviewer_comment || null,
    }).eq('id', req.params.id),
  ]);

  // Attestation de mise à jour — même traçabilité que l'acceptation d'une
  // proposition de section DIP, sur le DIP lié au contrat. Non-bloquant.
  if (contract.linked_dip_id) {
    createCertificate({
      userId: req.user.id, userEmail: req.user.email, dipId: contract.linked_dip_id,
      certificateType: 'MISE_A_JOUR',
      changes: [{
        id: proposal.clause_id,
        type: 'proposition_avocat_acceptee_contrat',
        section: clauseBefore?.clause_title || 'Clause',
        section_number: clauseBefore?.clause_number || null,
        ancien: clauseBefore?.content || '',
        nouveau: proposal.content_proposed || '',
        impact_legal: 'Moderate',
        recommandation_ia: 'Modification de clause proposée par l\'avocat et acceptée par le franchiseur.',
      }],
    }).catch(e => console.error('Certificate auto-gen error (clause proposal accept):', e.message));
  }

  res.json({ ok: true });
});

// PUT /api/avocat/clause-proposals/:id/reject — franchiseur rejette la proposition
router.put('/clause-proposals/:id/reject', authMiddleware, async (req, res) => {
  const { reviewer_comment } = req.body;

  const { data: proposal } = await supabaseAdmin
    .from('contract_clause_proposals').select('contract_id, status').eq('id', req.params.id).maybeSingle();
  if (!proposal) return res.status(404).json({ error: 'Proposition introuvable' });
  if (proposal.status !== 'pending') return res.status(400).json({ error: 'Proposition déjà traitée' });

  const { data: contract } = await supabaseAdmin
    .from('franchise_contracts').select('user_id').eq('id', proposal.contract_id).single();
  if (contract?.user_id !== req.user.id) return res.status(403).json({ error: 'Seul le franchiseur peut rejeter' });

  await supabaseAdmin.from('contract_clause_proposals').update({
    status: 'rejected',
    reviewer_id: req.user.id,
    reviewed_at: new Date().toISOString(),
    reviewer_comment: reviewer_comment || null,
  }).eq('id', req.params.id);

  res.json({ ok: true });
});

// POST /api/avocat/invite — le franchiseur invite son avocat par email
// Provisionne et lie tout de suite, sans étape intermédiaire pour l'avocat :
// c'est le franchiseur qui déclenche la création du compte (sans mot de
// passe — accès uniquement par le lien reçu) et la liaison à son propre
// dossier, jamais un tiers (admin) qui décide après coup qui est l'avocat
// de qui. L'avocat n'a rien à faire d'autre que cliquer le lien reçu.
router.post('/invite', authMiddleware, inviteLimiter, async (req, res) => {
  const { lawyer_email } = req.body;
  if (!lawyer_email?.trim()) return res.status(400).json({ error: 'Email requis' });

  const email = lawyer_email.trim().toLowerCase();
  const appUrl = getAppUrl();

  const { data: franchiseur } = await supabaseAdmin
    .from('users').select('id, company_name').eq('id', req.user.id).single();

  await supabaseAdmin.from('users').update({ lawyer_email: email }).eq('id', req.user.id);

  const { data: existing } = await supabaseAdmin
    .from('users').select('id, role, avocat_access_token').eq('email', email).maybeSingle();
  if (existing && existing.role !== 'avocat') {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email sous un autre rôle.' });
  }

  let avocatId = existing?.id;
  if (!avocatId) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true,
    });
    if (authError) return res.status(400).json({ error: authError.message });
    avocatId = authData.user.id;
  }

  const accessToken = existing?.avocat_access_token || uuidv4();
  const upsertPayload = {
    id: avocatId, email, role: 'avocat', trial_expires_at: null, avocat_access_token: accessToken,
  };
  if (!existing) {
    upsertPayload.company_name = email.split('@')[0];
    upsertPayload.created_at = new Date().toISOString();
  }
  const { error: profileError } = await supabaseAdmin
    .from('users').upsert(upsertPayload, { onConflict: 'id' });
  if (profileError) return res.status(500).json({ error: profileError.message });

  const now = new Date().toISOString();
  const { data: relExisting } = await supabaseAdmin
    .from('avocat_franchiseurs').select('id, status')
    .eq('avocat_id', avocatId).eq('franchiseur_id', req.user.id).maybeSingle();
  if (relExisting) {
    if (relExisting.status !== 'active') {
      await supabaseAdmin.from('avocat_franchiseurs')
        .update({ status: 'active', accepted_at: now }).eq('id', relExisting.id);
    }
  } else {
    await supabaseAdmin.from('avocat_franchiseurs').insert({
      avocat_id: avocatId, franchiseur_id: req.user.id, status: 'active', invited_at: now, accepted_at: now,
    });
  }

  const joinUrl = `${appUrl}/api/auth/avocat-login/${accessToken}`;

  const resendKey = process.env.RESEND_API_KEY;
  const companyName = franchiseur?.company_name || 'Un franchiseur';

  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: `DIPpro <${process.env.RESEND_SENDER_EMAIL || 'contact@dippro.business'}>`,
          to: [email],
          subject: `${companyName} vous invite à accéder à son DIP sur DIPpro`,
          html: `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:auto;color:#1A1826">
  <div style="background:linear-gradient(135deg,#9C4141,#A8893E);border-radius:12px 12px 0 0;padding:24px 32px">
    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;font-weight:600">DIPpro</p>
    <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);font-family:monospace">by Iralink Agency</p>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #f0ece4;border-top:none">
    <p style="margin:0 0 16px;font-size:15px">Bonjour,</p>
    <p style="margin:0 0 16px;font-size:15px"><strong>${companyName}</strong> vous invite à consulter et annoter son Document d'Information Précontractuelle (DIP) directement sur <strong>DIPpro</strong>.</p>
    <p style="margin:0 0 16px;font-size:14px;color:#475569">En cliquant sur le lien ci-dessous, vous pourrez :</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:2">
      <li>Consulter toutes les sections du DIP de votre client</li>
      <li>Proposer des modifications directement dans l'interface</li>
      <li>Suivre l'historique des versions et validations</li>
      <li>Accompagner plusieurs réseaux de franchise depuis un seul espace</li>
    </ul>
    <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#9C4141,#A8893E);color:#1A1826;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Accéder à l'espace de ${companyName} →</a>
    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8">Aucun mot de passe à créer — ce lien vous connecte directement à ce dossier. Conservez-le, il reste valable à chaque utilisation.</p>
    <hr style="border:none;border-top:1px solid #f0ece4;margin:24px 0">
    <p style="margin:0;font-size:11px;color:#94A3B8">DIPpro — Gestion des DIP franchise · Loi Doubin · <a href="${appUrl}/cgu" style="color:#9C4141">CGU</a></p>
  </div>
</div>`,
        }),
      });
    } catch {
      // Non-bloquant : l'invite est sauvegardée même si l'email échoue
    }
  }

  res.json({ success: true, message: 'Invitation envoyée', url: joinUrl });
});

// POST /api/avocat/invite-franchiseur — l'avocat invite un client franchiseur.
// Miroir exact de POST /invite (rôles inversés) : c'est désormais l'avocat,
// client payeur, qui provisionne et lie le compte franchiseur — sans mot de
// passe, accès uniquement par le lien reçu. Le franchiseur n'a rien à faire
// d'autre que cliquer le lien.
router.post('/invite-franchiseur', authMiddleware, requireAvocat, inviteLimiter, async (req, res) => {
  const { franchiseur_email, company_name } = req.body;
  if (!franchiseur_email?.trim()) return res.status(400).json({ error: 'Email requis' });

  const email = franchiseur_email.trim().toLowerCase();
  const appUrl = getAppUrl();

  const { data: avocat } = await supabaseAdmin
    .from('users').select('id, company_name, email').eq('id', req.user.id).single();

  const { data: existing } = await supabaseAdmin
    .from('users').select('id, role, franchiseur_access_token').eq('email', email).maybeSingle();
  if (existing && existing.role !== 'franchiseur') {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email sous un autre rôle.' });
  }

  let franchiseurId = existing?.id;
  if (!franchiseurId) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true,
    });
    if (authError) return res.status(400).json({ error: authError.message });
    franchiseurId = authData.user.id;
  }

  const accessToken = existing?.franchiseur_access_token || uuidv4();
  const upsertPayload = {
    id: franchiseurId, email, role: 'franchiseur', franchiseur_access_token: accessToken,
  };
  if (!existing) {
    upsertPayload.company_name = (company_name || email.split('@')[0]).trim().substring(0, 200);
    upsertPayload.created_at = new Date().toISOString();
    upsertPayload.lawyer_email = avocat?.email || null;
  }
  const { error: profileError } = await supabaseAdmin
    .from('users').upsert(upsertPayload, { onConflict: 'id' });
  if (profileError) return res.status(500).json({ error: profileError.message });

  const now = new Date().toISOString();
  const { data: relExisting } = await supabaseAdmin
    .from('avocat_franchiseurs').select('id, status')
    .eq('avocat_id', req.user.id).eq('franchiseur_id', franchiseurId).maybeSingle();
  if (relExisting) {
    if (relExisting.status !== 'active') {
      await supabaseAdmin.from('avocat_franchiseurs')
        .update({ status: 'active', accepted_at: now }).eq('id', relExisting.id);
    }
  } else {
    await supabaseAdmin.from('avocat_franchiseurs').insert({
      avocat_id: req.user.id, franchiseur_id: franchiseurId, status: 'active', invited_at: now, accepted_at: now,
    });
  }

  const joinUrl = `${appUrl}/api/auth/franchiseur-login/${accessToken}`;

  const resendKey = process.env.RESEND_API_KEY;
  const avocatName = avocat?.company_name || 'Votre avocat';

  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: `DIPpro <${process.env.RESEND_SENDER_EMAIL || 'contact@dippro.business'}>`,
          to: [email],
          subject: `${avocatName} vous invite à gérer votre DIP sur DIPpro`,
          html: `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:auto;color:#1A1826">
  <div style="background:linear-gradient(135deg,#9C4141,#A8893E);border-radius:12px 12px 0 0;padding:24px 32px">
    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;font-weight:600">DIPpro</p>
    <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);font-family:monospace">by Iralink Agency</p>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #f0ece4;border-top:none">
    <p style="margin:0 0 16px;font-size:15px">Bonjour,</p>
    <p style="margin:0 0 16px;font-size:15px"><strong>${avocatName}</strong> vous a créé un espace sur <strong>DIPpro</strong> pour gérer la conformité de votre Document d'Information Précontractuelle (DIP).</p>
    <p style="margin:0 0 16px;font-size:14px;color:#475569">En cliquant sur le lien ci-dessous, vous pourrez :</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:2">
      <li>Importer ou générer votre DIP</li>
      <li>Voir en direct ce qui est conforme, à vérifier ou non conforme</li>
      <li>Éditer vos sections — votre avocat en est notifié et confirme la conformité</li>
    </ul>
    <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#9C4141,#A8893E);color:#1A1826;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Accéder à mon espace →</a>
    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8">Aucun mot de passe à créer — ce lien vous connecte directement à votre dossier. Conservez-le, il reste valable à chaque utilisation.</p>
    <hr style="border:none;border-top:1px solid #f0ece4;margin:24px 0">
    <p style="margin:0;font-size:11px;color:#94A3B8">DIPpro — Gestion des DIP franchise · Loi Doubin · <a href="${appUrl}/cgu" style="color:#9C4141">CGU</a></p>
  </div>
</div>`,
        }),
      });
    } catch {
      // Non-bloquant : l'invite est sauvegardée même si l'email échoue
    }
  }

  res.json({ success: true, message: 'Invitation envoyée', url: joinUrl });
});

// ─── Annexes de section DIP / clause de contrat ───────────────────────────
// Bucket privé 'dip-annexes' (créé par la migration 037) — chemin toujours
// préfixé par l'id du franchiseur PROPRIÉTAIRE (jamais l'auteur de
// l'upload), pour que la policy storage reste simple à vérifier. Upload
// direct client → Supabase Storage (même pattern que DocumentsPage.jsx),
// ces routes ne font qu'enregistrer les métadonnées après coup.
const ANNEX_BUCKET = 'dip-annexes';

// Retourne l'id du franchiseur propriétaire si userId y a accès (propriétaire
// du DIP, ou avocat avec relation active vers ce franchiseur), sinon null.
async function resolveDipOwner(dipId, userId) {
  const { data: dip } = await supabaseAdmin.from('dip_documents').select('user_id').eq('id', dipId).maybeSingle();
  if (!dip) return null;
  if (dip.user_id === userId) return dip.user_id;
  const { data: rel } = await supabaseAdmin
    .from('avocat_franchiseurs').select('status')
    .eq('avocat_id', userId).eq('franchiseur_id', dip.user_id).maybeSingle();
  return rel?.status === 'active' ? dip.user_id : null;
}

async function resolveContractOwner(contractId, userId) {
  const { data: contract } = await supabaseAdmin.from('franchise_contracts').select('user_id').eq('id', contractId).maybeSingle();
  if (!contract) return null;
  if (contract.user_id === userId) return contract.user_id;
  const { data: rel } = await supabaseAdmin
    .from('avocat_franchiseurs').select('status')
    .eq('avocat_id', userId).eq('franchiseur_id', contract.user_id).maybeSingle();
  return rel?.status === 'active' ? contract.user_id : null;
}

// PATCH /api/avocat/sections/:sectionId/validate — l'avocat confirme (ou signale)
// la conformité d'une section modifiée directement par le franchiseur.
router.patch('/sections/:sectionId/validate', authMiddleware, requireAvocat, async (req, res) => {
  const { decision, comment } = req.body;
  if (!['validated', 'flagged'].includes(decision)) {
    return res.status(400).json({ error: 'decision doit être "validated" ou "flagged"' });
  }

  const { data: section } = await supabaseAdmin.from('dip_sections').select('*').eq('id', req.params.sectionId).maybeSingle();
  if (!section) return res.status(404).json({ error: 'Section introuvable' });

  const { data: dip } = await supabaseAdmin.from('dip_documents').select('id, user_id').eq('id', section.dip_id).maybeSingle();
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const { data: relation } = await supabaseAdmin
    .from('avocat_franchiseurs').select('status')
    .eq('avocat_id', req.user.id).eq('franchiseur_id', dip.user_id).maybeSingle();
  if (relation?.status !== 'active') return res.status(403).json({ error: 'Accès refusé' });

  const cleanComment = comment ? String(comment).trim().substring(0, 2000) : null;

  const { data, error } = await supabaseAdmin
    .from('dip_sections')
    .update({
      avocat_validation_status: decision,
      avocat_validated_by: req.user.id,
      avocat_validated_at: new Date().toISOString(),
      avocat_validation_comment: cleanComment,
    })
    .eq('id', req.params.sectionId)
    .select().single();
  if (error) return res.status(500).json({ error: errMsg(error) });

  if (decision === 'validated') {
    const { data: franchiseur } = await supabaseAdmin.from('users').select('email').eq('id', dip.user_id).maybeSingle();
    createCertificate({
      userId: dip.user_id, userEmail: franchiseur?.email, dipId: dip.id,
      certificateType: 'MISE_A_JOUR',
      changes: [{
        id: req.params.sectionId, type: 'validation_avocat_section',
        section: section.section_title, section_number: section.section_number,
        ancien: section.content || '', nouveau: section.content || '',
        impact_legal: 'Faible',
        recommandation_ia: `Conformité confirmée par l'avocat.${cleanComment ? ' Commentaire : ' + cleanComment : ''}`,
      }],
    }).catch(e => console.error('Certificate auto-gen error (avocat validation section):', e.message));
  }

  res.json({ section: data });
});

// PATCH /api/avocat/clauses/:clauseId/validate — équivalent pour les clauses de contrat.
router.patch('/clauses/:clauseId/validate', authMiddleware, requireAvocat, async (req, res) => {
  const { decision, comment } = req.body;
  if (!['validated', 'flagged'].includes(decision)) {
    return res.status(400).json({ error: 'decision doit être "validated" ou "flagged"' });
  }

  const { data: clause } = await supabaseAdmin.from('contract_clauses').select('*').eq('id', req.params.clauseId).maybeSingle();
  if (!clause) return res.status(404).json({ error: 'Clause introuvable' });

  const { data: contract } = await supabaseAdmin
    .from('franchise_contracts').select('id, user_id, linked_dip_id').eq('id', clause.contract_id).maybeSingle();
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });

  const { data: relation } = await supabaseAdmin
    .from('avocat_franchiseurs').select('status')
    .eq('avocat_id', req.user.id).eq('franchiseur_id', contract.user_id).maybeSingle();
  if (relation?.status !== 'active') return res.status(403).json({ error: 'Accès refusé' });

  const cleanComment = comment ? String(comment).trim().substring(0, 2000) : null;

  const { data, error } = await supabaseAdmin
    .from('contract_clauses')
    .update({
      avocat_validation_status: decision,
      avocat_validated_by: req.user.id,
      avocat_validated_at: new Date().toISOString(),
      avocat_validation_comment: cleanComment,
    })
    .eq('id', req.params.clauseId)
    .select().single();
  if (error) return res.status(500).json({ error: errMsg(error) });

  if (decision === 'validated' && contract.linked_dip_id) {
    const { data: franchiseur } = await supabaseAdmin.from('users').select('email').eq('id', contract.user_id).maybeSingle();
    createCertificate({
      userId: contract.user_id, userEmail: franchiseur?.email, dipId: contract.linked_dip_id,
      certificateType: 'MISE_A_JOUR',
      changes: [{
        id: req.params.clauseId, type: 'validation_avocat_clause',
        section: clause.clause_title, section_number: clause.clause_number,
        ancien: clause.content || '', nouveau: clause.content || '',
        impact_legal: 'Faible',
        recommandation_ia: `Conformité confirmée par l'avocat.${cleanComment ? ' Commentaire : ' + cleanComment : ''}`,
      }],
    }).catch(e => console.error('Certificate auto-gen error (avocat validation clause):', e.message));
  }

  res.json({ clause: data });
});

// GET /api/avocat/pending-validations — vue agrégée de tout ce qui attend une
// confirmation avocat, tous franchiseurs actifs confondus (alimente le
// dashboard avocat et l'explorateur de fichiers).
router.get('/pending-validations', authMiddleware, requireAvocat, async (req, res) => {
  const { data: relations } = await supabaseAdmin
    .from('avocat_franchiseurs').select('franchiseur_id, validation_mode')
    .eq('avocat_id', req.user.id).eq('status', 'active');

  const franchiseurIds = (relations || []).map(r => r.franchiseur_id);
  if (!franchiseurIds.length) return res.json({ sections: [], clauses: [] });

  const { data: franchiseurUsers } = await supabaseAdmin
    .from('users').select('id, company_name').in('id', franchiseurIds);
  const companyNameByFranchiseur = Object.fromEntries((franchiseurUsers || []).map(u => [u.id, u.company_name]));

  const { data: dips } = await supabaseAdmin
    .from('dip_documents').select('id, title, user_id').in('user_id', franchiseurIds);
  const dipIds = (dips || []).map(d => d.id);
  const dipById = Object.fromEntries((dips || []).map(d => [d.id, { ...d, company_name: companyNameByFranchiseur[d.user_id] }]));

  const { data: contracts } = await supabaseAdmin
    .from('franchise_contracts').select('id, title, user_id').in('user_id', franchiseurIds);
  const contractIds = (contracts || []).map(c => c.id);
  const contractById = Object.fromEntries((contracts || []).map(c => [c.id, { ...c, company_name: companyNameByFranchiseur[c.user_id] }]));

  const [{ data: sections }, { data: clauses }] = await Promise.all([
    dipIds.length
      ? supabaseAdmin.from('dip_sections').select('*').in('dip_id', dipIds).eq('avocat_validation_status', 'pending')
      : Promise.resolve({ data: [] }),
    contractIds.length
      ? supabaseAdmin.from('contract_clauses').select('*').in('contract_id', contractIds).eq('avocat_validation_status', 'pending')
      : Promise.resolve({ data: [] }),
  ]);

  res.json({
    sections: (sections || []).map(s => ({ ...s, dip: dipById[s.dip_id] })),
    clauses: (clauses || []).map(c => ({ ...c, contract: contractById[c.contract_id] })),
  });
});

// POST /api/avocat/dip/:dipId/annexes — annexe rattachée au DIP entier
// (comme sur un acte juridique : énumérées à la fin, dans l'ordre d'ajout —
// jamais éparpillées section par section, cf. migration 048).
router.post('/dip/:dipId/annexes', authMiddleware, async (req, res) => {
  const { file_name, storage_path, size_bytes } = req.body;
  if (!file_name || !storage_path) {
    return res.status(400).json({ error: 'file_name et storage_path requis' });
  }
  const ownerId = await resolveDipOwner(req.params.dipId, req.user.id);
  if (!ownerId) return res.status(403).json({ error: 'Accès refusé' });
  if (!storage_path.startsWith(`${ownerId}/`)) return res.status(403).json({ error: 'Chemin de stockage invalide' });

  const { count } = await supabaseAdmin
    .from('dip_section_annexes').select('id', { count: 'exact', head: true }).eq('dip_id', req.params.dipId);

  const { data: signedUrlData } = await supabaseAdmin.storage.from(ANNEX_BUCKET).createSignedUrl(storage_path, 3600);
  const { data: inserted, error } = await supabaseAdmin
    .from('dip_section_annexes')
    .insert({
      dip_id: req.params.dipId,
      uploaded_by: req.user.id,
      file_name: file_name.substring(0, 255),
      storage_path,
      file_url: signedUrlData?.signedUrl || null,
      size_bytes: size_bytes || null,
      position: (count || 0) + 1,
    })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ annexe: inserted });
});

// GET /api/avocat/dip/:dipId/annexes
router.get('/dip/:dipId/annexes', authMiddleware, async (req, res) => {
  const ownerId = await resolveDipOwner(req.params.dipId, req.user.id);
  if (!ownerId) return res.status(403).json({ error: 'Accès refusé' });

  const { data, error } = await supabaseAdmin
    .from('dip_section_annexes').select('*').eq('dip_id', req.params.dipId).order('position', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ annexes: data || [] });
});

// POST /api/avocat/contract/:contractId/annexes — annexe rattachée au contrat entier
router.post('/contract/:contractId/annexes', authMiddleware, async (req, res) => {
  const { file_name, storage_path, size_bytes } = req.body;
  if (!file_name || !storage_path) {
    return res.status(400).json({ error: 'file_name et storage_path requis' });
  }
  const ownerId = await resolveContractOwner(req.params.contractId, req.user.id);
  if (!ownerId) return res.status(403).json({ error: 'Accès refusé' });
  if (!storage_path.startsWith(`${ownerId}/`)) return res.status(403).json({ error: 'Chemin de stockage invalide' });

  const { count } = await supabaseAdmin
    .from('dip_section_annexes').select('id', { count: 'exact', head: true }).eq('contract_id', req.params.contractId);

  const { data: signedUrlData } = await supabaseAdmin.storage.from(ANNEX_BUCKET).createSignedUrl(storage_path, 3600);
  const { data: inserted, error } = await supabaseAdmin
    .from('dip_section_annexes')
    .insert({
      contract_id: req.params.contractId,
      uploaded_by: req.user.id,
      file_name: file_name.substring(0, 255),
      storage_path,
      file_url: signedUrlData?.signedUrl || null,
      size_bytes: size_bytes || null,
      position: (count || 0) + 1,
    })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ annexe: inserted });
});

// GET /api/avocat/contract/:contractId/annexes
router.get('/contract/:contractId/annexes', authMiddleware, async (req, res) => {
  const ownerId = await resolveContractOwner(req.params.contractId, req.user.id);
  if (!ownerId) return res.status(403).json({ error: 'Accès refusé' });

  const { data, error } = await supabaseAdmin
    .from('dip_section_annexes').select('*').eq('contract_id', req.params.contractId).order('position', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ annexes: data || [] });
});

// DELETE /api/avocat/annexes/:id
router.delete('/annexes/:id', authMiddleware, async (req, res) => {
  const { data: annexe, error: fetchErr } = await supabaseAdmin
    .from('dip_section_annexes').select('*').eq('id', req.params.id).maybeSingle();
  if (fetchErr || !annexe) return res.status(404).json({ error: 'Annexe introuvable' });

  const ownerId = annexe.dip_id
    ? await resolveDipOwner(annexe.dip_id, req.user.id)
    : await resolveContractOwner(annexe.contract_id, req.user.id);
  if (!ownerId && annexe.uploaded_by !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });

  await supabaseAdmin.storage.from(ANNEX_BUCKET).remove([annexe.storage_path]);
  const { error } = await supabaseAdmin.from('dip_section_annexes').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/avocat/dip/:dipId/send-to-client — "Envoyer au client" : génère
// le PDF du DIP à la volée et le joint à un email. L'avocat choisit
// librement le destinataire (son client franchiseur, un candidat-franchisé,
// ou toute autre adresse) — rien n'est présupposé.
router.post('/dip/:dipId/send-to-client', authMiddleware, requireAvocat, sendDocLimiter, async (req, res) => {
  const { recipient_email, recipient_name, subject, message } = req.body;
  if (!recipient_email?.trim()) return res.status(400).json({ error: 'Email destinataire requis' });
  const cleanEmail = recipient_email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Format d\'email invalide' });

  const ownerId = await resolveDipOwner(req.params.dipId, req.user.id);
  if (!ownerId) return res.status(403).json({ error: 'Accès refusé' });

  const { data: dip } = await supabaseAdmin
    .from('dip_documents').select('*, dip_sections(*)').eq('id', req.params.dipId).maybeSingle();
  if (!dip) return res.status(404).json({ error: 'DIP introuvable' });

  const { data: franchiseurUser } = await supabaseAdmin
    .from('users').select('company_name, siret').eq('id', ownerId).maybeSingle();

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ error: 'Envoi indisponible pour le moment.' });

  let pdfBuffer;
  try {
    pdfBuffer = await pdfDocToBuffer(buildDipDocumentPdf(dip, franchiseurUser || {}));
  } catch (err) {
    console.error('send-to-client PDF error:', err.message);
    return res.status(500).json({ error: 'Échec de la génération du PDF.' });
  }

  const cleanSubject = (subject?.trim() || `Document d'Information Précontractuelle — ${franchiseurUser?.company_name || ''}`).substring(0, 200);
  const cleanMessage = (message?.trim() || `Bonjour${recipient_name ? ' ' + recipient_name.trim() : ''},\n\nVeuillez trouver ci-joint le Document d'Information Précontractuelle.\n\nCordialement,`).substring(0, 4000);
  const safeFileName = (franchiseurUser?.company_name || 'DIP').replace(/[^a-z0-9]/gi, '_').substring(0, 40);

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'DIPpro <contact@dippro.business>',
        to: [cleanEmail],
        reply_to: req.user.email,
        subject: cleanSubject,
        html: `<p>${escapeHtml(cleanMessage).replace(/\n/g, '<br/>')}</p>`,
        attachments: [{ filename: `DIP-${safeFileName}.pdf`, content: pdfBuffer.toString('base64') }],
      }),
    });
    if (!resendRes.ok) {
      const errBody = await resendRes.text().catch(() => '');
      console.error('send-to-client Resend error:', resendRes.status, errBody);
      return res.status(502).json({ error: "Échec de l'envoi." });
    }
  } catch (err) {
    console.error('send-to-client Resend error:', err.message);
    return res.status(502).json({ error: "Échec de l'envoi." });
  }

  res.json({ success: true });
});

// POST /api/avocat/contract/:contractId/send-to-client — équivalent pour un contrat.
router.post('/contract/:contractId/send-to-client', authMiddleware, requireAvocat, sendDocLimiter, async (req, res) => {
  const { recipient_email, recipient_name, subject, message } = req.body;
  if (!recipient_email?.trim()) return res.status(400).json({ error: 'Email destinataire requis' });
  const cleanEmail = recipient_email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Format d\'email invalide' });

  const ownerId = await resolveContractOwner(req.params.contractId, req.user.id);
  if (!ownerId) return res.status(403).json({ error: 'Accès refusé' });

  const { data: contract } = await supabaseAdmin
    .from('franchise_contracts').select('*, contract_clauses(*)').eq('id', req.params.contractId).maybeSingle();
  if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });

  const { data: franchiseurUser } = await supabaseAdmin
    .from('users').select('company_name, siret').eq('id', ownerId).maybeSingle();

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ error: 'Envoi indisponible pour le moment.' });

  let pdfBuffer;
  try {
    pdfBuffer = await pdfDocToBuffer(buildContractPdf(contract, franchiseurUser || {}));
  } catch (err) {
    console.error('send-to-client PDF error:', err.message);
    return res.status(500).json({ error: 'Échec de la génération du PDF.' });
  }

  const cleanSubject = (subject?.trim() || `Contrat de franchise — ${franchiseurUser?.company_name || ''}`).substring(0, 200);
  const cleanMessage = (message?.trim() || `Bonjour${recipient_name ? ' ' + recipient_name.trim() : ''},\n\nVeuillez trouver ci-joint le contrat de franchise.\n\nCordialement,`).substring(0, 4000);
  const safeFileName = (franchiseurUser?.company_name || 'contrat').replace(/[^a-z0-9]/gi, '_').substring(0, 40);

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'DIPpro <contact@dippro.business>',
        to: [cleanEmail],
        reply_to: req.user.email,
        subject: cleanSubject,
        html: `<p>${escapeHtml(cleanMessage).replace(/\n/g, '<br/>')}</p>`,
        attachments: [{ filename: `Contrat-franchise-${safeFileName}.pdf`, content: pdfBuffer.toString('base64') }],
      }),
    });
    if (!resendRes.ok) {
      const errBody = await resendRes.text().catch(() => '');
      console.error('send-to-client Resend error:', resendRes.status, errBody);
      return res.status(502).json({ error: "Échec de l'envoi." });
    }
  } catch (err) {
    console.error('send-to-client Resend error:', err.message);
    return res.status(502).json({ error: "Échec de l'envoi." });
  }

  res.json({ success: true });
});

module.exports = router;
