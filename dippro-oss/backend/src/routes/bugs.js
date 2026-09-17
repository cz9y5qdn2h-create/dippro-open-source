const express = require('express');
const rateLimit = require('express-rate-limit');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;

const bugLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de signalements. Réessayez dans une heure.' }
});

// Limiteur plus souple pour la capture automatique des erreurs JS (crash runtime)
const clientErrorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'erreurs signalées.' }
});

async function resolveUser(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return {};
  const token = header.split(' ')[1];
  if (!token || token.length > 4096) return {};
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return {};
    const { data: profile } = await supabaseAdmin
      .from('users').select('company_name').eq('id', user.id).single();
    return { userId: user.id, userEmail: user.email || null, userCompany: profile?.company_name || null };
  } catch {
    return {};
  }
}

async function notifyAdmin(report) {
  const icons = { bloquant: '🔴', normal: '🟡', 'cosmétique': '🟢' };
  const labels = { bloquant: 'BLOQUANT', normal: 'Normal', 'cosmétique': 'Cosmétique' };
  const icon = icons[report.severity] || '⚪';
  const label = labels[report.severity] || report.severity;
  const who = report.user_company || report.user_email || 'Visiteur non connecté';
  const page = report.page_url || '—';
  const desc = report.description;

  // Email via Resend
  if (process.env.RESEND_API_KEY && ADMIN_EMAIL) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `DIPpro Bugs <${process.env.RESEND_SENDER_EMAIL || 'contact@dippro.business'}>`,
        to: [ADMIN_EMAIL],
        subject: `${icon} [Bug DIPpro] ${label} — ${who}`,
        html: `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;background:#080808;color:#f0f0f0;padding:28px;border-radius:10px;border:1px solid #222">
  <h2 style="margin:0 0 20px;font-size:17px;color:#e53e3e">${icon} Bug DIPpro — <span style="font-weight:400">${label}</span></h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <tr><td style="padding:5px 0;color:#888;width:120px">Utilisateur</td><td>${report.user_company ? `<strong>${report.user_company}</strong>` : '—'} ${report.user_email ? `(${report.user_email})` : '(non connecté)'}</td></tr>
    <tr><td style="padding:5px 0;color:#888">Page</td><td style="word-break:break-all">${page}</td></tr>
    <tr><td style="padding:5px 0;color:#888">Bug ID</td><td style="font-family:monospace;font-size:11px">${report.id}</td></tr>
  </table>
  <div style="background:#1a1a1a;border-radius:6px;padding:14px;margin-bottom:${report.error_stack ? '14px' : '0'}">
    <p style="color:#9c4141;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em">Description</p>
    <p style="margin:0;line-height:1.6;white-space:pre-wrap;font-size:13px">${desc}</p>
  </div>
  ${report.error_stack ? `<div style="background:#1a1a1a;border-radius:6px;padding:14px"><p style="color:#888;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em">Stack trace</p><pre style="margin:0;font-size:10px;white-space:pre-wrap;word-break:break-all;color:#aaa">${report.error_stack.slice(0, 2000)}</pre></div>` : ''}
  <p style="margin:20px 0 0;font-size:10px;color:#444">DIPpro by Iralink · Rapports de bugs</p>
</div>`
      })
    }).catch(() => {});
  }

  // WhatsApp via Twilio
  const adminWa = process.env.ADMIN_WHATSAPP;
  const twSid = process.env.TWILIO_ACCOUNT_SID;
  const twToken = process.env.TWILIO_AUTH_TOKEN;
  const twFrom = process.env.TWILIO_WHATSAPP_FROM;
  if (adminWa && twSid && twToken && twFrom) {
    const to = adminWa.startsWith('whatsapp:') ? adminWa : `whatsapp:${adminWa}`;
    const body = `${icon} *Bug DIPpro — ${label}*\n\n👤 ${who}\n📍 ${page}\n\n📝 ${desc.slice(0, 280)}${desc.length > 280 ? '…' : ''}`;
    fetch(`https://api.twilio.com/2010-04-01/Accounts/${twSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${twSid}:${twToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ From: twFrom, To: to, Body: body }).toString()
    }).catch(() => {});
  }

  // Slack webhook
  if (process.env.ADMIN_SLACK_WEBHOOK) {
    fetch(process.env.ADMIN_SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${icon} *Bug DIPpro — ${label}* — ${who}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `${icon} Bug DIPpro — ${label}` } },
          { type: 'section', fields: [
            { type: 'mrkdwn', text: `*Utilisateur*\n${who}` },
            { type: 'mrkdwn', text: `*Page*\n${page.replace(/https?:\/\/[^/]+/, '') || '/'}` }
          ]},
          { type: 'section', text: { type: 'mrkdwn', text: `*Description*\n${desc.slice(0, 500)}` } }
        ]
      })
    }).catch(() => {});
  }
}

// POST /api/bugs — auth optionnelle, rate-limité
router.post('/', bugLimiter, async (req, res) => {
  const { userId, userEmail, userCompany } = await resolveUser(req);
  const { description, page_url, error_stack, severity = 'normal' } = req.body;

  if (!description?.trim()) return res.status(400).json({ error: 'description requise' });
  if (!['bloquant', 'normal', 'cosmétique'].includes(severity)) {
    return res.status(400).json({ error: 'severity invalide (bloquant | normal | cosmétique)' });
  }

  const { data: report, error } = await supabaseAdmin.from('bug_reports').insert({
    user_id: userId || null,
    user_email: userEmail || null,
    user_company: userCompany || null,
    description: description.trim().slice(0, 3000),
    page_url: page_url?.slice(0, 500) || null,
    user_agent: req.get('user-agent')?.slice(0, 500) || null,
    error_stack: error_stack?.slice(0, 5000) || null,
    severity,
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  notifyAdmin(report);
  res.status(201).json({ ok: true, bug_id: report.id });
});

// POST /api/bugs/client-error — capture automatique des crashes JS (auth optionnelle)
router.post('/client-error', clientErrorLimiter, async (req, res) => {
  const { userId, userEmail, userCompany } = await resolveUser(req);
  const { message, stack, component_stack, page_url, error_type } = req.body;

  if (!message?.trim() && !stack?.trim()) {
    return res.status(400).json({ error: 'message ou stack requis' });
  }

  const description = [
    `[CRASH AUTO] ${error_type || 'Error'} : ${(message || 'sans message').slice(0, 500)}`,
    component_stack ? `\n\nComposant :${component_stack.slice(0, 1500)}` : '',
  ].join('');

  const fullStack = [stack || '', component_stack ? `\n\n--- Component stack ---\n${component_stack}` : '']
    .join('')
    .slice(0, 5000);

  const { data: report, error } = await supabaseAdmin.from('bug_reports').insert({
    user_id: userId || null,
    user_email: userEmail || null,
    user_company: userCompany || null,
    description: description.slice(0, 3000),
    page_url: page_url?.slice(0, 500) || null,
    user_agent: req.get('user-agent')?.slice(0, 500) || null,
    error_stack: fullStack || null,
    severity: 'bloquant',
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  notifyAdmin(report);
  res.status(201).json({ ok: true, bug_id: report.id });
});

// GET /api/bugs — admin uniquement
router.get('/', authMiddleware, async (req, res) => {
  const { data: profile } = await supabaseAdmin
    .from('users').select('role').eq('id', req.user.id).single();
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Réservé à l\'administrateur' });

  const { status, limit = 50, offset = 0 } = req.query;
  let query = supabaseAdmin
    .from('bug_reports')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bugs: data || [], total: count || 0 });
});

// PATCH /api/bugs/:id — admin uniquement
router.patch('/:id', authMiddleware, async (req, res) => {
  const { data: profile } = await supabaseAdmin
    .from('users').select('role').eq('id', req.user.id).single();
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Réservé à l\'administrateur' });

  const { status, admin_note } = req.body;
  const validStatuses = ['ouvert', 'en_cours', 'résolu', 'ignoré'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'status invalide' });
  }

  const update = {};
  if (status !== undefined) update.status = status;
  if (admin_note !== undefined) update.admin_note = admin_note;

  const { data, error } = await supabaseAdmin
    .from('bug_reports').update(update).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bug: data });
});

module.exports = router;
