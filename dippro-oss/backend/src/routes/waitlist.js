const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { sendTransactionalEmail } = require('../config/email');
const router = express.Router();

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const ALLOWED_STATUSES = ['pending', 'contacted', 'converted', 'dismissed'];
const ALLOWED_PARTIAL_SOURCES = ['waitlist_form', 'landing_form'];

const requireAdmin = async (req, res, next) => {
  const { data } = await supabaseAdmin.from('users').select('role').eq('id', req.user.id).single();
  if (data?.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
  next();
};

// POST /api/waitlist — public, sans authentification
router.post('/', async (req, res) => {
  const { email, company_name, phone, message, source, user_id } = req.body;

  if (!email || !company_name) {
    return res.status(400).json({ error: 'Email et nom de société requis' });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Format d\'email invalide' });
  }

  if (String(company_name).trim().length > 200) {
    return res.status(400).json({ error: 'Nom de société trop long (200 caractères max)' });
  }

  if (message && String(message).length > 2000) {
    return res.status(400).json({ error: 'Message trop long (2000 caractères max)' });
  }

  const { data: existing } = await supabaseAdmin
    .from('waitlist').select('id').eq('email', cleanEmail).maybeSingle();

  if (existing) {
    return res.json({ message: 'Vous êtes déjà sur la liste d\'attente', already_exists: true });
  }

  const { error } = await supabaseAdmin.from('waitlist').insert({
    email:        cleanEmail,
    company_name: String(company_name).trim().substring(0, 200),
    phone:        phone ? String(phone).trim().substring(0, 30) || null : null,
    message:      message ? String(message).trim().substring(0, 2000) || null : null,
    source:       ['trial_expired', 'register', 'standalone'].includes(source) ? source : 'standalone',
    user_id:      user_id || null,
    status:       'pending'
  });

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ message: 'Inscription confirmée — nous vous contacterons très bientôt.' });
});

// POST /api/waitlist/partial — public, sans authentification
// Capture l'email dès qu'il quitte le champ, avant tout envoi complet du
// formulaire — permet une relance même si le visiteur abandonne. Un seul
// email de relance par adresse, jamais renvoyé (notified_at).
router.post('/partial', async (req, res) => {
  const { email, source } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const cleanEmail = String(email).toLowerCase().trim();
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Format d\'email invalide' });
  }
  const cleanSource = ALLOWED_PARTIAL_SOURCES.includes(source) ? source : 'waitlist_form';

  const { data: alreadyOnWaitlist } = await supabaseAdmin
    .from('waitlist').select('id').eq('email', cleanEmail).maybeSingle();
  if (alreadyOnWaitlist) return res.json({ ok: true });

  const { data: existing } = await supabaseAdmin
    .from('waitlist_partial_emails').select('id, notified_at').eq('email', cleanEmail).maybeSingle();
  if (existing?.notified_at) return res.json({ ok: true });

  let partialId = existing?.id;
  if (!partialId) {
    const { data: inserted, error } = await supabaseAdmin
      .from('waitlist_partial_emails')
      .insert({ email: cleanEmail, source: cleanSource })
      .select('id')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    partialId = inserted.id;
  }

  const html = `
    <div style="font-family:'DM Sans',system-ui,sans-serif;max-width:520px;margin:auto;padding:32px 28px;">
      <p style="font-size:15px;color:#1A1826;line-height:1.6;">Bonjour,</p>
      <p style="font-size:15px;color:#1A1826;line-height:1.6;">
        Vous avez commencé une inscription sur DIPpro — votre <strong>analyse gratuite de conformité DIP</strong>
        (score Loi Doubin en 30 secondes, valeur 250€) est à deux minutes de vous.
      </p>
      <p style="margin:28px 0;">
        <a href="https://iralink-agency.dippro.business/waitlist" style="background:#9C4141;color:#080808;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">Terminer mon inscription</a>
      </p>
      <p style="font-size:12px;color:#94A3B8;line-height:1.6;">
        Si vous n'êtes pas à l'origine de cette démarche, ignorez simplement cet email — vous ne recevrez rien de plus.
        Voir notre <a href="https://iralink-agency.dippro.business/privacy" style="color:#9C4141;">politique de confidentialité</a>.
      </p>
      <p style="font-size:12px;color:#94A3B8;">DIPpro by Iralink</p>
    </div>`;

  const result = await sendTransactionalEmail(
    cleanEmail, null, 'Votre check de conformité DIP est presque prêt', html
  );

  if (result.ok) {
    await supabaseAdmin.from('waitlist_partial_emails')
      .update({ notified_at: new Date().toISOString() }).eq('id', partialId);
  }

  res.json({ ok: true });
});

// GET /api/waitlist/count — public, retourne uniquement le nombre d'inscrits
router.get('/count', async (req, res) => {
  const { count, error } = await supabaseAdmin
    .from('waitlist')
    .select('id', { count: 'exact', head: true });
  if (error) return res.status(500).json({ count: 0 });
  res.json({ count: count || 0 });
});

// GET /api/waitlist — admin uniquement
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  const { status } = req.query;
  let query = supabaseAdmin.from('waitlist').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all' && ALLOWED_STATUSES.includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const total = data?.length || 0;
  const pending = (data || []).filter(w => w.status === 'pending').length;
  res.json({ waitlist: data || [], total, pending });
});

// PATCH /api/waitlist/:id — admin uniquement
router.patch('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { status, notes } = req.body;
  const updates = { updated_at: new Date().toISOString() };

  if (status) {
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    updates.status = status;
  }
  if (notes !== undefined) updates.notes = String(notes).substring(0, 1000);

  const { error } = await supabaseAdmin.from('waitlist').update(updates).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Mis à jour' });
});

// DELETE /api/waitlist/:id — admin uniquement
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin.from('waitlist').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Supprimé' });
});

module.exports = router;
