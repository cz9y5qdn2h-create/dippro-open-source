const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\s.-]{6,20}$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// POST /api/leads/litiges-dip — public, sans authentification
router.post('/litiges-dip', async (req, res) => {
  const { nom, email, telephone, structure, consentement } = req.body;

  if (!nom || !email || !telephone) {
    return res.status(400).json({ error: 'Nom, email et téléphone requis' });
  }
  if (!consentement) {
    return res.status(400).json({ error: 'Le consentement est requis pour recevoir la ressource' });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Format d\'email invalide' });
  }

  const cleanPhone = String(telephone).trim();
  if (!PHONE_RE.test(cleanPhone)) {
    return res.status(400).json({ error: 'Format de téléphone invalide' });
  }

  if (String(nom).trim().length > 200) {
    return res.status(400).json({ error: 'Nom trop long (200 caractères max)' });
  }
  if (structure && String(structure).length > 200) {
    return res.status(400).json({ error: 'Nom de cabinet/structure trop long (200 caractères max)' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Envoi de la ressource indisponible pour le moment.' });
  }

  const cleanNom = String(nom).trim().substring(0, 200);
  const cleanStructure = structure ? String(structure).trim().substring(0, 200) : null;
  const resourceUrl = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/ressources/base-litiges-dip`
    : 'https://dippro.business/ressources/base-litiges-dip';

  const { error: insertError } = await supabaseAdmin.from('leads_litiges_dip').insert({
    nom: cleanNom,
    email: cleanEmail,
    telephone: cleanPhone,
    structure: cleanStructure,
    source: 'linkedin_post12_pivot_avocats',
    consentement_horodatage: new Date().toISOString(),
  });

  if (insertError) return res.status(500).json({ error: insertError.message });

  try {
    const resourceRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'DIPpro <contact@dippro.business>',
        to: [cleanEmail],
        subject: 'Votre base des litiges DIP — Loi Doubin',
        html: `
          <p>Bonjour ${escapeHtml(cleanNom)},</p>
          <p>Merci pour votre intérêt. Voici l'accès à la base des litiges DIP (Loi Doubin) : sanctions, jurisprudence récente et fondements juridiques classés par manquement.</p>
          <p><a href="${resourceUrl}">${resourceUrl}</a></p>
          <p>Nous restons à votre disposition pour tout échange sur DIPpro, l'outil de conformité DIP conçu pour les avocats en droit de la franchise.</p>
          <p>L'équipe DIPpro — Iralink Agency</p>
          <p style="font-size:12px;color:#888;">Vous recevez cet email suite à votre demande sur dippro.business. Pour vous désinscrire, écrivez à privacy@iralink-agency.com.</p>
        `
      })
    });
    if (!resourceRes.ok) {
      const errBody = await resourceRes.text().catch(() => '');
      console.error('Resend leads litiges-dip error:', resourceRes.status, errBody);
    }
  } catch (err) {
    console.error('Resend leads litiges-dip error:', err.message);
  }

  const notifyTo = process.env.RESEND_CONTACT_TO_EMAIL;
  if (notifyTo) fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'DIPpro <contact@dippro.business>',
      to: [notifyTo],
      subject: `[Lead litiges DIP] ${cleanNom}${cleanStructure ? ` — ${cleanStructure}` : ''}`,
      html: `
        <p>Nouveau lead — base des litiges DIP (LinkedIn Post 12)</p>
        <p>Nom : ${escapeHtml(cleanNom)}<br/>
        Email : ${escapeHtml(cleanEmail)}<br/>
        Téléphone : ${escapeHtml(cleanPhone)}<br/>
        Cabinet/structure : ${escapeHtml(cleanStructure || '—')}</p>
      `
    })
  }).catch(err => console.error('Resend leads notification error:', err.message));

  res.status(201).json({ message: 'Merci — la ressource vient de vous être envoyée par email.' });
});

module.exports = router;
