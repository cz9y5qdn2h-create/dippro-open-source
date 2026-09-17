const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { resolveScopedUserId } = require('../middleware/avocatScope');
const router = express.Router();

const LEGAL_DELAY_DAYS = 20;

function computeSignatureDelay(dip_delivered_at, planned_signature_date) {
  if (!dip_delivered_at || !planned_signature_date) return null;
  const daysBetween = Math.round((new Date(planned_signature_date) - new Date(dip_delivered_at)) / 86400000);
  return { days_between: daysBetween, compliant: daysBetween >= LEGAL_DELAY_DAYS };
}

// Conformité RÉELLE, recalculée en direct depuis les statuts des
// sections/clauses — les colonnes stockées (compliance_level,
// conformity_score) peuvent être nulles (DIP générés par create-from-agent)
// ou périmées (éditions manuelles postérieures à l'analyse). Même formule
// que le moteur d'analyse : -20 par non_conforme, -8 par a_verifier.
// strictPending : passé à true quand la relation avocat active du franchiseur
// est en validation_mode 'strict'. Une section/clause "conforme" mais dont
// avocat_validation_status vaut 'pending' n'est alors pas encore comptée
// conforme — l'avocat n'a pas confirmé cette version du contenu.
function computeLiveCompliance(items, { strictPending = false } = {}) {
  if (!items?.length) return { compliance_level: null, conformity_score: null, blocking_count: 0, non_conforme: 0, a_verifier: 0, conforme: 0, pending_validation: 0 };
  const nonConforme = items.filter(s => s.status === 'non_conforme').length;
  const aVerifier = items.filter(s => s.status === 'a_verifier').length;
  const blocking = items.filter(s => s.legal_blocking && s.status !== 'conforme').length;
  const pendingValidation = items.filter(s => s.avocat_validation_status === 'pending').length;
  const pendingUnconfirmed = strictPending
    ? items.filter(s => s.avocat_validation_status === 'pending' && s.status === 'conforme').length
    : 0;
  const score = Math.max(0, 100 - nonConforme * 20 - aVerifier * 8 - pendingUnconfirmed * 8);
  let level;
  if (blocking > 0) level = 'BLOQUANT_NON_ENVOYABLE';
  else if (nonConforme > 0) level = 'RÉVISIONS_MAJEURES';
  else if (aVerifier > 0 || pendingUnconfirmed > 0) level = 'RÉVISIONS_MINEURES';
  else level = 'CONFORME';
  return {
    compliance_level: level,
    conformity_score: score,
    blocking_count: blocking,
    non_conforme: nonConforme,
    a_verifier: aVerifier,
    conforme: items.length - nonConforme - aVerifier - pendingUnconfirmed,
    pending_validation: pendingValidation,
  };
}

// GET /api/compliance/overview — un seul endroit qui rassemble tous les
// signaux de conformité DIP, quelle que soit leur origine (contenu
// incomplet, délai légal de 20 jours, risques de litige, veille
// réglementaire, candidats en reprise nécessitant des pièces
// supplémentaires) — franchiseur pour ses propres données, avocat pour un
// client sélectionné via ?franchiseur_id=.
router.get('/overview', authMiddleware, async (req, res) => {
  const scopedUserId = await resolveScopedUserId(req);
  if (!scopedUserId) return res.status(403).json({ error: 'Accès refusé' });

  const [
    { data: dips },
    { data: contracts },
    { data: alerts },
    { data: franchisees },
    { data: avocatRelation },
  ] = await Promise.all([
    supabaseAdmin.from('dip_documents').select('id, title, blocking_issues, dip_sections(status, legal_blocking, avocat_validation_status)').eq('user_id', scopedUserId).eq('status', 'actif').limit(1),
    supabaseAdmin.from('franchise_contracts').select('id, title, contract_clauses(status, legal_blocking, avocat_validation_status)').eq('user_id', scopedUserId).eq('status', 'actif').limit(1),
    supabaseAdmin.from('alerts').select('id, type, title, source, suggestion, urgency, created_at, dip_id, franchisee_id').eq('user_id', scopedUserId).eq('status', 'pending').order('created_at', { ascending: false }),
    supabaseAdmin.from('franchisees').select('id, name, status, candidate_type, dip_delivered_at, planned_signature_date').eq('franchiseur_id', scopedUserId),
    supabaseAdmin.from('avocat_franchiseurs').select('validation_mode').eq('franchiseur_id', scopedUserId).eq('status', 'active').maybeSingle(),
  ]);

  const strictPending = avocatRelation?.validation_mode === 'strict';
  const dipRaw = dips?.[0] || null;
  const contractRaw = contracts?.[0] || null;
  const dip = dipRaw
    ? { id: dipRaw.id, title: dipRaw.title, blocking_issues: dipRaw.blocking_issues, ...computeLiveCompliance(dipRaw.dip_sections, { strictPending }) }
    : null;
  const contract = contractRaw
    ? { id: contractRaw.id, title: contractRaw.title, ...computeLiveCompliance(contractRaw.contract_clauses, { strictPending }) }
    : null;
  const allAlerts = alerts || [];

  const signatureDelays = (franchisees || [])
    .filter(f => f.status === 'en_cours')
    .map(f => ({ ...f, signature_delay: computeSignatureDelay(f.dip_delivered_at, f.planned_signature_date) }))
    .filter(f => f.signature_delay);

  const reprises = (franchisees || []).filter(f => f.candidate_type === 'reprise' && f.status === 'en_cours');

  const { data: regulatoryNews } = await supabaseAdmin
    .from('regulatory_news_cache')
    .select('id, title, url, source, impact_level, impact_reason, published_at')
    .in('impact_level', ['high', 'critical'])
    .order('published_at', { ascending: false })
    .limit(5);

  res.json({
    dip,
    contract,
    alerts: {
      total: allAlerts.length,
      haute: allAlerts.filter(a => a.urgency === 'haute').length,
      moyenne: allAlerts.filter(a => a.urgency === 'moyenne').length,
      faible: allAlerts.filter(a => a.urgency === 'faible').length,
      items: allAlerts.slice(0, 10),
    },
    signature_delays: {
      count: signatureDelays.filter(f => !f.signature_delay.compliant).length,
      items: signatureDelays,
    },
    reprises: {
      count: reprises.length,
      items: reprises,
    },
    regulatory_news: regulatoryNews || [],
  });
});

module.exports = router;
module.exports.computeLiveCompliance = computeLiveCompliance;
