const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { getAppUrl } = require('../config/appUrl');
const router = express.Router();

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// Plafond volontairement bas : un envoi "à la chaîne" trop rapide dégrade la
// réputation du domaine d'envoi Resend, ce qui affecterait aussi les emails
// transactionnels (réinitialisation de mot de passe, notifications) qui
// partagent la même infrastructure d'envoi.
const DAILY_SEND_CAP = 15;

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const requireAdmin = async (req, res, next) => {
  const { data } = await supabaseAdmin.from('users').select('role').eq('id', req.user.id).single();
  if (data?.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
  next();
};

// POST /api/outreach/import — admin uniquement. Importe une liste de cibles
// (nom, email, cabinet) — aucune source de données tierce câblée ici : la
// découverte de cibles reste une décision produit séparée (choix d'un
// fournisseur d'enrichissement + clé API dédiée côté backend).
router.post('/import', authMiddleware, requireAdmin, async (req, res) => {
  const { targets } = req.body;
  if (!Array.isArray(targets) || !targets.length) {
    return res.status(400).json({ error: 'targets requis (tableau de {email, nom, cabinet})' });
  }

  const rows = [];
  for (const t of targets.slice(0, 500)) {
    const email = String(t.email || '').toLowerCase().trim();
    if (!EMAIL_RE.test(email)) continue;
    rows.push({
      email,
      nom: t.nom ? String(t.nom).trim().substring(0, 200) : null,
      cabinet: t.cabinet ? String(t.cabinet).trim().substring(0, 200) : null,
      source: t.source ? String(t.source).substring(0, 50) : 'import_manuel',
    });
  }
  if (!rows.length) return res.status(400).json({ error: 'Aucune cible valide dans la liste fournie' });

  const { error } = await supabaseAdmin.from('outreach_targets')
    .upsert(rows, { onConflict: 'email', ignoreDuplicates: true });
  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ imported: rows.length });
});

// GET /api/outreach — admin uniquement, vue de suivi
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  const { status, limit = 100 } = req.query;
  let query = supabaseAdmin.from('outreach_targets').select('*', { count: 'exact' })
    .order('created_at', { ascending: false }).limit(Number(limit));
  if (status) query = query.eq('status', status);
  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ targets: data || [], total: count || 0 });
});

async function draftOutreachEmail({ nom, cabinet }) {
  const appUrl = getAppUrl();
  const prompt = `Rédige un email de prospection B2B court (120 mots maximum), en français, pour DIPpro (Iralink Agency), un logiciel de conformité DIP (Loi Doubin) pour cabinets d'avocats en droit de la franchise.

Destinataire : ${nom || 'un avocat'}${cabinet ? `, cabinet ${cabinet}` : ''}.

Contraintes :
- Ton direct, professionnel, jamais familier ni ampoulé.
- Une seule proposition de valeur claire : centraliser la conformité DIP de tous les clients franchiseurs du cabinet, avec validation avocat de chaque modification.
- Un seul appel à l'action : découvrir DIPpro sur ${appUrl}.
- Aucun chiffre ou statistique inventé, aucune promesse de résultat garanti.
- Pas d'objet d'email, juste le corps du message, en texte brut (pas de HTML).
- Signe "${process.env.OUTREACH_SIGNATURE || "L'équipe DIPpro"}".`;

  const msg = await claude.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content.find(b => b.type === 'text');
  return (block?.text || '').trim();
}

async function sendOutreachEmail(target) {
  const key = process.env.RESEND_API_KEY;
  const fromEmail = process.env.OUTREACH_FROM_EMAIL;
  if (!key) throw new Error('RESEND_API_KEY manquante');
  if (!fromEmail) throw new Error("OUTREACH_FROM_EMAIL manquante — configurez l'identité d'envoi avant d'activer la prospection automatique.");

  const body = await draftOutreachEmail(target);
  if (!body) throw new Error('Échec de génération du message');

  const appUrl = getAppUrl();
  const unsubscribeUrl = `${appUrl}/api/outreach/unsubscribe/${target.unsubscribe_token}`;
  const html = `
    <div style="font-family:sans-serif;font-size:14px;color:#1A1826;line-height:1.6;">
      ${body.split('\n').map(p => `<p>${p}</p>`).join('')}
      <p style="margin-top:24px;font-size:11px;color:#94A3B8;">
        Vous recevez cet email dans le cadre d'une prospection B2B concernant votre activité professionnelle (art. L.34-5 CPCE).
        <a href="${unsubscribeUrl}" style="color:#94A3B8;">Se désinscrire</a> — vous ne recevrez alors plus aucun message de notre part.
      </p>
    </div>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: [target.email],
      reply_to: process.env.ADMIN_EMAIL || fromEmail,
      subject: 'DIPpro — conformité DIP pour vos clients franchiseurs',
      html,
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Resend ${resp.status}: ${errBody}`);
  }
}

// GET /api/outreach/run — cron Vercel (GET uniquement, comme /api/monitor/run
// et /api/cron/daily). Envoie un lot borné de cibles "à contacter".
// Fail-closed : sans secret configuré en production, l'endpoint refuse de
// s'exécuter pour n'importe qui.
router.get('/run', async (req, res) => {
  const secret = process.env.OUTREACH_CRON_SECRET;
  if (secret) {
    if (req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: targets, error } = await supabaseAdmin
    .from('outreach_targets')
    .select('*')
    .eq('status', 'a_contacter')
    .order('created_at', { ascending: true })
    .limit(DAILY_SEND_CAP);

  if (error) return res.status(500).json({ error: error.message });
  if (!targets?.length) return res.json({ sent: 0, failed: 0 });

  let sent = 0, failed = 0;
  for (const target of targets) {
    try {
      await sendOutreachEmail(target);
      await supabaseAdmin.from('outreach_targets')
        .update({ status: 'contacte', contacted_at: new Date().toISOString() })
        .eq('id', target.id);
      sent++;
    } catch (err) {
      console.error(`Outreach send error (${target.email}):`, err.message);
      failed++;
    }
  }

  res.json({ sent, failed });
});

// GET /api/outreach/unsubscribe/:token — public, sans authentification.
// Désinscription immédiate et permanente — jamais recontacté ensuite.
router.get('/unsubscribe/:token', async (req, res) => {
  await supabaseAdmin.from('outreach_targets')
    .update({ status: 'desinscrit' })
    .eq('unsubscribe_token', req.params.token);
  res.type('html').send('<p style="font-family:sans-serif">Vous avez été désinscrit. Vous ne recevrez plus aucun message de notre part.</p>');
});

module.exports = router;
