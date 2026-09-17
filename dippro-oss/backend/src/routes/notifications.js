const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const { sendTransactionalEmail: sendEmail } = require('../config/email');
const router = express.Router();

// Envoyer un message WhatsApp via Twilio
async function sendWhatsApp(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // ex: whatsapp:+14155238886

  if (!sid || !token || !from) return { ok: false, error: 'Twilio non configuré' };

  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ From: from, To: formattedTo, Body: message }).toString()
  });

  const data = await res.json();
  return { ok: res.ok, sid: data.sid, error: data.message };
}

// Envoyer un SMS via Twilio
async function sendSMS(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;

  if (!sid || !token || !from) return { ok: false, error: 'Twilio SMS non configuré' };

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ From: from, To: to, Body: message }).toString()
  });

  const data = await res.json();
  return { ok: res.ok, sid: data.sid, error: data.message };
}

// POST /api/notifications/send — Envoyer une notification aux franchisés
router.post('/send', authMiddleware, requireFranchisor, async (req, res) => {
  const { dip_id, message, channels = ['email'], franchisee_ids } = req.body;
  if (!message) return res.status(400).json({ error: 'Message requis' });

  // Charger les franchisés ciblés
  let query = supabaseAdmin.from('franchisees').select('*').eq('franchiseur_id', req.user.id).eq('status', 'actif');
  if (franchisee_ids?.length) query = query.in('id', franchisee_ids);
  const { data: franchisees } = await query;

  if (!franchisees?.length) return res.status(400).json({ error: 'Aucun franchisé actif à notifier' });

  // Charger le profil du franchiseur pour l'expéditeur (+ clé Resend)
  const { data: franchisor } = await supabaseAdmin.from('users')
    .select('company_name, resend_api_key, resend_sender_name, resend_sender_email')
    .eq('id', req.user.id).single();
  const companyName = franchisor?.company_name || 'Votre franchiseur';

  const results = { email: [], whatsapp: [], sms: [], errors: [] };

  for (const f of franchisees) {
    // Email
    if (channels.includes('email') && f.email) {
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#080808;color:#F4F2EE;padding:32px;border-radius:12px;border:1px solid #222">
          <div style="border-bottom:1px solid #9C4141;padding-bottom:16px;margin-bottom:24px">
            <h2 style="color:#9C4141;margin:0">Mise à jour de votre DIP</h2>
            <p style="color:#5A5A5A;font-size:12px;margin:4px 0 0">${companyName} · DIPpro</p>
          </div>
          <p style="color:#F4F2EE;line-height:1.6">Madame, Monsieur ${f.name},</p>
          <p style="color:#F4F2EE;line-height:1.6;white-space:pre-wrap">${message}</p>
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #222;font-size:11px;color:#5A5A5A">
            DIPpro by Iralink — Document d'Information Précontractuelle — Loi Doubin Art. L.330-3
          </div>
        </div>`;
      const emailResult = await sendEmail(
        f.email, f.name,
        `[${companyName}] Mise à jour de votre DIP`,
        html,
        franchisor?.resend_api_key,
        franchisor?.resend_sender_name,
        franchisor?.resend_sender_email
      );
      if (emailResult.ok) results.email.push(f.email);
      else results.errors.push({ channel: 'email', franchisee: f.name, error: emailResult.error });
    }

    // WhatsApp (FEATURE_WHATSAPP=true requis)
    if (process.env.FEATURE_WHATSAPP === 'true' && channels.includes('whatsapp') && f.whatsapp_number) {
      const wpMessage = `*${companyName} — Mise à jour DIP*\n\nBonjour ${f.name},\n\n${message}\n\n_DIPpro by Iralink_`;
      const wpResult = await sendWhatsApp(f.whatsapp_number, wpMessage);
      if (wpResult.ok) results.whatsapp.push(f.whatsapp_number);
      else results.errors.push({ channel: 'whatsapp', franchisee: f.name, error: wpResult.error });
    }

    // SMS
    if (channels.includes('sms') && f.phone) {
      const smsMessage = `${companyName} - Mise à jour DIP: ${message.substring(0, 120)}... Consultez votre espace DIPpro.`;
      const smsResult = await sendSMS(f.phone, smsMessage);
      if (smsResult.ok) results.sms.push(f.phone);
      else results.errors.push({ channel: 'sms', franchisee: f.name, error: smsResult.error });
    }
  }

  // Enregistrer en base
  if (dip_id) {
    const notifications = franchisees.map(f => ({
      franchisee_id: f.id, dip_id,
      message,
      sent_at: new Date().toISOString(),
      status: 'sent'
    }));
    await supabaseAdmin.from('notifications').insert(notifications);
  }

  res.json({
    sent: franchisees.length,
    results,
    message: `Notifications envoyées à ${franchisees.length} franchisé(s)`
  });
});

// POST /api/notifications/test — Tester un canal de notification
router.post('/test', authMiddleware, requireFranchisor, async (req, res) => {
  const { channel, target } = req.body;

  if (channel === 'email') {
    const result = await sendEmail(target, 'Test', 'Test DIPpro', '<p>Test de notification DIPpro réussi ✓</p>');
    return res.json({ ok: result.ok, error: result.error });
  }
  if (channel === 'whatsapp') {
    const result = await sendWhatsApp(target, '✅ Test DIPpro — Notifications WhatsApp opérationnelles.');
    return res.json({ ok: result.ok, error: result.error });
  }
  if (channel === 'sms') {
    const result = await sendSMS(target, 'Test DIPpro - Notifications SMS opérationnelles.');
    return res.json({ ok: result.ok, error: result.error });
  }

  res.status(400).json({ error: 'Canal non reconnu (email | whatsapp | sms)' });
});

// GET /api/notifications/status — Statut des canaux configurés
router.get('/status', authMiddleware, async (req, res) => {
  const whatsappEnabled = process.env.FEATURE_WHATSAPP === 'true';
  res.json({
    email: {
      configured: !!process.env.RESEND_API_KEY,
      sender: process.env.RESEND_SENDER_EMAIL || null,
      enabled: true
    },
    whatsapp: {
      enabled: whatsappEnabled,
      configured: whatsappEnabled && !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM),
      from: whatsappEnabled ? (process.env.TWILIO_WHATSAPP_FROM || null) : null
    },
    sms: {
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_SMS_FROM),
      from: process.env.TWILIO_SMS_FROM || null,
      enabled: true
    }
  });
});

module.exports = router;
