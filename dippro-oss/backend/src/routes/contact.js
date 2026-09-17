const express = require('express');
const router = express.Router();

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// POST /api/contact — public, sans authentification
router.post('/', async (req, res) => {
  const { name, email, company, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Nom, email et message requis' });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Format d\'email invalide' });
  }
  if (String(name).trim().length > 200) {
    return res.status(400).json({ error: 'Nom trop long (200 caractères max)' });
  }
  if (company && String(company).length > 200) {
    return res.status(400).json({ error: 'Nom de société trop long (200 caractères max)' });
  }
  if (String(message).trim().length < 5 || String(message).length > 4000) {
    return res.status(400).json({ error: 'Message invalide (5 à 4000 caractères)' });
  }

  const key = process.env.RESEND_API_KEY;
  const contactTo = process.env.RESEND_CONTACT_TO_EMAIL;
  if (!key || !contactTo) {
    return res.status(503).json({ error: 'Envoi de messages indisponible pour le moment.' });
  }

  const cleanName = String(name).trim().substring(0, 200);
  const cleanCompany = company ? String(company).trim().substring(0, 200) : null;
  const cleanMessage = String(message).trim().substring(0, 4000);

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'DIPpro <contact@dippro.business>',
        to: [contactTo],
        reply_to: cleanEmail,
        subject: `[Contact DIPpro] ${cleanName}${cleanCompany ? ` — ${cleanCompany}` : ''}`,
        html: `
          <p><strong>Nom :</strong> ${escapeHtml(cleanName)}</p>
          <p><strong>Email :</strong> ${escapeHtml(cleanEmail)}</p>
          ${cleanCompany ? `<p><strong>Société :</strong> ${escapeHtml(cleanCompany)}</p>` : ''}
          <p><strong>Message :</strong></p>
          <p>${escapeHtml(cleanMessage).replace(/\n/g, '<br/>')}</p>
        `
      })
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text().catch(() => '');
      console.error('Resend contact error:', resendRes.status, errBody);
      return res.status(502).json({ error: 'Échec de l\'envoi du message. Réessayez ou écrivez-nous directement.' });
    }
  } catch (err) {
    console.error('Resend contact error:', err.message);
    return res.status(502).json({ error: 'Échec de l\'envoi du message. Réessayez ou écrivez-nous directement.' });
  }

  res.status(201).json({ message: 'Message envoyé — nous vous répondrons rapidement.' });
});

module.exports = router;
