// Envoi transactionnel — Resend. Module partagé pour ne pas dupliquer l'appel
// HTTP dans chaque route (notifications, certificats, avocat, franchisés,
// bugs) : migré depuis Brevo, un seul point de vérité pour le format de
// l'API et les valeurs par défaut d'expéditeur.
async function sendTransactionalEmail(to, name, subject, htmlContent, userApiKey, senderName, senderEmail) {
  const key = userApiKey || process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'Clé Resend non configurée. Renseignez-la dans Paramètres > Emails.' };

  const fromName = senderName || process.env.RESEND_SENDER_NAME || 'DIPpro';
  const fromEmail = senderEmail || process.env.RESEND_SENDER_EMAIL || 'contact@dippro.business';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html: htmlContent,
    }),
  });
  return { ok: res.ok, status: res.status };
}

module.exports = { sendTransactionalEmail };
