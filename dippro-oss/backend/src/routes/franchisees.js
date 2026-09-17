const express = require('express');
const { getAppUrl } = require('../config/appUrl');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const { generateUpdateSummary } = require('../config/claude');
const router = express.Router();

const MAX_CSV_ROWS = 500;
const LEGAL_DELAY_DAYS = 20;

// Délai légal Art. L.330-3 / R.330-2 C. com. — le DIP (et le projet de
// contrat) doit être remis au moins 20 jours pleins avant la signature ou
// tout versement de somme. Calcule un statut exploitable côté UI pour
// chaque candidat dont les deux dates sont renseignées.
function computeSignatureDelay(dip_delivered_at, planned_signature_date) {
  if (!dip_delivered_at || !planned_signature_date) return null;
  const delivered = new Date(dip_delivered_at);
  const planned = new Date(planned_signature_date);
  const daysBetween = Math.round((planned - delivered) / 86400000);
  return {
    days_between: daysBetween,
    days_remaining: LEGAL_DELAY_DAYS - Math.round((new Date() - delivered) / 86400000),
    compliant: daysBetween >= LEGAL_DELAY_DAYS,
  };
}

// Crée/retire l'alerte "délai 20 jours" pour un franchisé selon la
// conformité calculée — appelé après chaque création/modification pour que
// l'alerte reflète toujours l'état courant des deux dates.
async function syncSignatureDelayAlert(franchiseurId, franchisee) {
  const delay = computeSignatureDelay(franchisee.dip_delivered_at, franchisee.planned_signature_date);
  const nonCompliant = delay && !delay.compliant;

  const { data: existing } = await supabaseAdmin
    .from('alerts')
    .select('id')
    .eq('franchisee_id', franchisee.id)
    .eq('source', 'Délai légal 20 jours')
    .eq('status', 'pending')
    .maybeSingle();

  if (nonCompliant && !existing) {
    await supabaseAdmin.from('alerts').insert({
      user_id: franchiseurId,
      franchisee_id: franchisee.id,
      type: 'delai_20_jours',
      title: `Délai légal non respecté — ${franchisee.name}`,
      source: 'Délai légal 20 jours',
      suggestion: `Le DIP a été remis le ${franchisee.dip_delivered_at} pour une signature prévue le ${franchisee.planned_signature_date}, soit ${delay.days_between} jour(s) — l'article R.330-2 du Code de commerce exige un délai minimum de ${LEGAL_DELAY_DAYS} jours pleins avant signature ou tout versement de somme. Reportez la date de signature ou re-remettez le DIP.`,
      urgency: 'haute',
      status: 'pending',
    }).then(({ error }) => { if (error) console.error('Signature delay alert error:', error.message); });
  } else if (!nonCompliant && existing) {
    await supabaseAdmin.from('alerts').update({ status: 'validated', resolved_at: new Date().toISOString() }).eq('id', existing.id);
  }
}

// POST /api/franchisees/import-csv — import CSV bulk
router.post('/import-csv', authMiddleware, requireFranchisor, async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows requis (tableau CSV parsé)' });
  }

  if (rows.length > MAX_CSV_ROWS) {
    return res.status(400).json({ error: `Maximum ${MAX_CSV_ROWS} lignes par import` });
  }

  const toInsert = rows
    .filter(r => r.email || r.name)
    .map(r => ({
      franchiseur_id: req.user.id,
      name: (r.name || r.nom || '').trim(),
      email: (r.email || '').trim().toLowerCase(),
      phone: (r.phone || r.telephone || r.tel || '').trim() || null,
      whatsapp_number: (r.whatsapp || r.whatsapp_number || '').trim() || null,
      territory: (r.territory || r.territoire || '').trim() || null,
      status: 'actif'
    }))
    .filter(r => r.name && r.email);

  if (toInsert.length === 0) {
    return res.status(400).json({ error: 'Aucune ligne valide (name + email requis)' });
  }

  const { data, error } = await supabaseAdmin
    .from('franchisees')
    .insert(toInsert)
    .select();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ imported: data.length, franchisees: data });
});

// GET /api/franchisees
router.get('/', authMiddleware, requireFranchisor, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const from  = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('franchisees')
    .select('id,franchiseur_id,name,email,phone,whatsapp_number,territory,contract_start,contract_end,status,candidate_type,dip_delivered_at,planned_signature_date,created_at', { count: 'exact' })
    .eq('franchiseur_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) return res.status(500).json({ error: error.message });

  const enriched = (data || []).map(f => ({
    ...f,
    signature_delay: computeSignatureDelay(f.dip_delivered_at, f.planned_signature_date),
  }));
  res.set('Cache-Control', 'private, max-age=15');
  res.json({ franchisees: enriched, total: count, page, limit });
});

// POST /api/franchisees
router.post('/', authMiddleware, requireFranchisor, async (req, res) => {
  const { name, email, territory, contract_start, contract_end, whatsapp_number, phone, candidate_type, dip_delivered_at, planned_signature_date } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });

  const { data, error } = await supabaseAdmin.from('franchisees').insert({
    franchiseur_id: req.user.id, name, email, territory, contract_start, contract_end,
    whatsapp_number: whatsapp_number || null, phone: phone || null,
    candidate_type: candidate_type || 'creation',
    dip_delivered_at: dip_delivered_at || null,
    planned_signature_date: planned_signature_date || null,
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  await syncSignatureDelayAlert(req.user.id, data);
  res.status(201).json({ franchisee: { ...data, signature_delay: computeSignatureDelay(data.dip_delivered_at, data.planned_signature_date) } });
});

// PUT /api/franchisees/:id
router.put('/:id', authMiddleware, requireFranchisor, async (req, res) => {
  const { name, email, territory, contract_start, contract_end, status, whatsapp_number, phone, candidate_type, dip_delivered_at, planned_signature_date } = req.body;
  const { data, error } = await supabaseAdmin.from('franchisees')
    .update({ name, email, territory, contract_start, contract_end, status,
              whatsapp_number: whatsapp_number || null, phone: phone || null,
              candidate_type: candidate_type || 'creation',
              dip_delivered_at: dip_delivered_at || null,
              planned_signature_date: planned_signature_date || null })
    .eq('id', req.params.id).eq('franchiseur_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await syncSignatureDelayAlert(req.user.id, data);
  res.json({ franchisee: { ...data, signature_delay: computeSignatureDelay(data.dip_delivered_at, data.planned_signature_date) } });
});

// DELETE /api/franchisees/:id
router.delete('/:id', authMiddleware, requireFranchisor, async (req, res) => {
  await supabaseAdmin.from('franchisees')
    .delete().eq('id', req.params.id).eq('franchiseur_id', req.user.id);
  res.json({ message: 'Franchisé supprimé' });
});

// POST /api/franchisees/notify - Notifier les franchisés d'une mise à jour DIP
router.post('/notify', authMiddleware, requireFranchisor, async (req, res) => {
  const { dip_id, updated_sections } = req.body;
  if (!dip_id || !updated_sections) return res.status(400).json({ error: 'Paramètres manquants' });

  const { data: franchisees } = await supabaseAdmin
    .from('franchisees').select('*').eq('franchiseur_id', req.user.id).eq('status', 'actif');

  if (!franchisees || franchisees.length === 0) {
    return res.json({ message: 'Aucun franchisé actif', sent: 0 });
  }

  const summary = await generateUpdateSummary(updated_sections);

  // Enregistrer les notifications
  const notifications = franchisees.map(f => ({
    franchisee_id: f.id,
    dip_id,
    sections_updated: JSON.stringify(updated_sections),
    message: summary,
    sent_at: new Date().toISOString(),
    status: 'sent'
  }));

  await supabaseAdmin.from('notifications').insert(notifications);

  // Envoyer les emails via Resend (si configuré)
  if (process.env.RESEND_API_KEY) {
    for (const franchisee of franchisees) {
      await sendResendEmail(franchisee.email, franchisee.name, summary, dip_id);
    }
  }

  res.json({ message: `Notifications envoyées à ${franchisees.length} franchisé(s)`, summary });
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendResendEmail(email, name, summary, dipId) {
  try {
    const frontendUrl = getAppUrl();
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${process.env.RESEND_SENDER_NAME || 'DIPpro'} <${process.env.RESEND_SENDER_EMAIL || 'contact@dippro.business'}>`,
        to: [email],
        subject: 'Mise à jour de votre DIP - Action requise',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#080808;color:#F4F2EE;padding:32px;border-radius:8px"><h2 style="color:#9C4141">Mise à jour du DIP</h2><p>${escapeHtml(summary)}</p><p style="margin-top:24px"><a href="${frontendUrl}/dip" style="background:#9C4141;color:#080808;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600">Consulter le DIP mis à jour</a></p></div>`
      })
    });
    return response.ok;
  } catch (e) { console.error('Resend error:', e); return false; }
}

module.exports = router;
