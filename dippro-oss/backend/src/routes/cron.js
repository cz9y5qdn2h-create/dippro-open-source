/**
 * Cron journalier DIPpro — exécuté à 00h00 par Vercel
 *
 * Orchestration :
 *  1. Vérifie toutes les sources URL (monitoring_sources) de tous les utilisateurs
 *  2. Envoie un email digest aux utilisateurs qui ont des changements (si notifications_email activé)
 *  3. Crée des alertes in-app pour les impacts critiques/élevés
 *  4. Les moniteurs de fichiers (Drive/OneDrive) restent gérés par /api/monitor/run (3×/jour)
 *
 * Sécurité : Vercel injecte Authorization: Bearer ${CRON_SECRET} automatiquement.
 * Définir CRON_SECRET dans les variables Vercel pour activer la validation.
 */

const express = require('express');
const { getAppUrl } = require('../config/appUrl');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { fetchNewsItems } = require('../config/newsFeeds');
const { computeLiveCompliance } = require('./compliance');
const { LEGAL_REFS } = require('../config/dipSections');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_RUN_MS = 55_000; // marge avant timeout Vercel (60s)
const BATCH_SIZE = 4;       // sources vérifiées en parallèle par batch

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail-closed en production : un secret manquant ne doit jamais rendre
    // ce endpoint public (il déclenche des appels IA coûteux et des emails
    // à tous les franchisés). Fail-open uniquement en dev local.
    return process.env.NODE_ENV !== 'production';
  }
  return req.headers.authorization === `Bearer ${secret}`;
}

async function sendEmail(to, name, subject, html, profile) {
  const key = profile?.resend_api_key || process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const fromName = profile?.resend_sender_name || process.env.RESEND_SENDER_NAME || 'DIPpro';
    const fromEmail = profile?.resend_sender_email || process.env.RESEND_SENDER_EMAIL || 'contact@dippro.business';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkOneSource(source) {
  let content = '';
  let fetchError = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const resp = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DIPpro-Monitor/1.0' },
    });
    clearTimeout(timer);
    const html = await resp.text();
    content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
  } catch (e) {
    fetchError = e.message;
  }

  const contentHash = content
    ? Buffer.from(content).toString('base64').slice(0, 64)
    : '';
  const changeDetected =
    source.last_content_hash !== null &&
    source.last_content_hash !== contentHash;

  let impactLevel = 'none';
  let impactSummary = null;
  let impactDetail = null;

  if (content && (!source.last_content_hash || changeDetected)) {
    const keywords =
      source.keywords?.length > 0
        ? source.keywords.join(', ')
        : 'franchise, DIP, Loi Doubin';
    try {
      const aiResp = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `Expert droit franchise française. Source : "${source.url}". Mots-clés : ${keywords}.

Contenu :
${content.slice(0, 5000)}

Réponds UNIQUEMENT en JSON (sans markdown) :
{"impact_level":"none|low|medium|high|critical","impact_summary":"1 phrase max","impact_detail":"2-3 phrases ou null"}`,
        }],
      });
      const raw = aiResp.content[0].text.trim().replace(/```json?\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(raw);
      impactLevel = parsed.impact_level || 'none';
      impactSummary = parsed.impact_summary || null;
      impactDetail = parsed.impact_detail || null;
    } catch {
      impactLevel = 'low';
      impactSummary = 'Contenu récupéré — analyse manuelle recommandée';
    }
  } else if (fetchError) {
    impactSummary = `Inaccessible : ${fetchError.slice(0, 100)}`;
  }

  await Promise.all([
    supabaseAdmin.from('monitoring_results').insert({
      source_id: source.id,
      user_id: source.user_id,
      change_detected: changeDetected,
      impact_level: impactLevel,
      impact_summary: impactSummary,
      impact_detail: impactDetail,
      content_snippet: content.slice(0, 400) || null,
    }),
    supabaseAdmin.from('monitoring_sources').update({
      last_checked_at: new Date().toISOString(),
      last_content_hash: contentHash || source.last_content_hash,
      updated_at: new Date().toISOString(),
    }).eq('id', source.id),
  ]);

  return { changeDetected, impactLevel, impactSummary, name: source.name };
}

function buildDigestHtml(companyName, changes, appUrl) {
  const impactColor = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', none: '#6b7280',
  };
  const rows = changes.map(c => {
    const col = impactColor[c.impactLevel] || '#6b7280';
    return `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1e1a16;font-size:13px;color:#e8e4dc">${c.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e1a16">
        <span style="background:${col}22;color:${col};padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;font-family:monospace;letter-spacing:.05em">${c.impactLevel.toUpperCase()}</span>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #1e1a16;font-size:12px;color:#a09890;line-height:1.5">${c.impactSummary || '—'}</td>
    </tr>`;
  }).join('');

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>DIPpro — Veille documentaire</title></head>
<body style="margin:0;padding:0;background:#060608;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f5c842 0%,#d4a532 100%);border-radius:16px;padding:28px 32px;margin-bottom:24px;text-align:center">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.12em;font-family:monospace;color:#3d2a00;text-transform:uppercase">Rapport quotidien</p>
      <h1 style="margin:0 0 6px;color:#0a0805;font-size:28px;font-weight:700;letter-spacing:-1px">DIPpro</h1>
      <p style="margin:0;color:#5a3e00;font-size:13px">${today}</p>
    </div>

    <!-- Body -->
    <div style="background:#0f0d0b;border-radius:16px;border:1px solid #2a2520;padding:28px;margin-bottom:20px">
      <h2 style="margin:0 0 8px;color:#f0ede7;font-size:17px;font-weight:600">
        Bonsoir${companyName ? ', ' + companyName : ''} 👋
      </h2>
      <p style="margin:0 0 24px;color:#a09890;font-size:13px;line-height:1.65">
        DIPpro a analysé vos sources de veille et détecté des changements potentiellement
        pertinents pour votre Document d'Information Précontractuelle.
      </p>

      <!-- Table -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #2a2520">
        <thead>
          <tr style="background:#1a1612">
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#9c4141;letter-spacing:.08em;font-family:monospace;text-transform:uppercase">Source</th>
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#9c4141;letter-spacing:.08em;font-family:monospace;text-transform:uppercase">Impact</th>
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#9c4141;letter-spacing:.08em;font-family:monospace;text-transform:uppercase">Résumé</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p style="margin:20px 0 0;color:#5e5a54;font-size:11px;line-height:1.5">
        ℹ️ L'analyse est réalisée par IA (Claude). Vérifiez toujours les sources avant toute mise à jour de votre DIP.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:8px 0 24px">
      <a href="${appUrl}/monitoring"
        style="background:linear-gradient(135deg,#f5c842,#d4a532);color:#0a0805;text-decoration:none;
               padding:13px 32px;border-radius:12px;font-size:14px;font-weight:700;display:inline-block;
               letter-spacing:.01em">
        Voir le rapport complet →
      </a>
    </div>

    <!-- Footer -->
    <p style="text-align:center;margin:0;color:#3a3630;font-size:11px">
      DIPpro · Veille réglementaire franchise ·
      <a href="${appUrl}/settings" style="color:#6a5f4a">Paramètres des notifications</a>
    </p>
  </div>
</body></html>`;
}

function buildAvocatDigestHtml(avocatName, summary, averageScore, appUrl) {
  const levelColor = { CONFORME: '#34d399', RÉVISIONS_MINEURES: '#eab308', RÉVISIONS_MAJEURES: '#f97316', BLOQUANT_NON_ENVOYABLE: '#ef4444' };

  const clientBlocks = summary.map(c => {
    const col = c.score == null ? '#6b7280' : (levelColor[c.level] || '#6b7280');
    const issueRows = (c.issues || []).slice(0, 5).map(i => `
      <tr>
        <td style="padding:6px 16px;border-bottom:1px solid #1e1a16;font-size:12px;color:#e8e4dc">Section ${i.section_number} — ${i.section_title}</td>
        <td style="padding:6px 16px;border-bottom:1px solid #1e1a16;font-size:11px;color:#a09890">${i.status}</td>
        <td style="padding:6px 16px;border-bottom:1px solid #1e1a16;font-size:11px;color:#a09890;font-family:monospace">${i.legal_reference || '—'}</td>
      </tr>`).join('');

    return `<div style="background:#0f0d0b;border-radius:12px;border:1px solid #2a2520;padding:20px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:14px;font-weight:600;color:#f0ede7">${c.company_name || 'Client'}</span>
        <span style="background:${col}22;color:${col};padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;font-family:monospace">${c.score == null ? 'AUCUN DIP' : c.score + '%'}</span>
      </div>
      ${issueRows ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>${issueRows}</tbody></table>` : `<p style="margin:0;font-size:12px;color:#5e9d78">Toutes les sections analysées sont conformes.</p>`}
    </div>`;
  }).join('');

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>DIPpro — Compte-rendu de conformité</title></head>
<body style="margin:0;padding:0;background:#060608;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:linear-gradient(135deg,#f5c842 0%,#d4a532 100%);border-radius:16px;padding:28px 32px;margin-bottom:24px;text-align:center">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.12em;font-family:monospace;color:#3d2a00;text-transform:uppercase">Compte-rendu de conformité</p>
      <h1 style="margin:0 0 6px;color:#0a0805;font-size:28px;font-weight:700;letter-spacing:-1px">DIPpro</h1>
      <p style="margin:0;color:#5a3e00;font-size:13px">${today}${averageScore != null ? ` · Score moyen du portefeuille : ${averageScore}%` : ''}</p>
    </div>
    <div style="margin-bottom:8px">
      <h2 style="margin:0 0 16px;color:#f0ede7;font-size:17px;font-weight:600">
        Bonjour${avocatName ? ', ' + avocatName : ''}
      </h2>
    </div>
    ${clientBlocks}
    <p style="margin:20px 0 0;color:#5e5a54;font-size:11px;line-height:1.5;text-align:center">
      ⚠️ Ce compte-rendu est une aide à la priorisation, pas un avis juridique — il ne remplace pas votre analyse du dossier.
    </p>
    <div style="text-align:center;padding:20px 0 8px">
      <a href="${appUrl}/fichiers"
        style="background:linear-gradient(135deg,#f5c842,#d4a532);color:#0a0805;text-decoration:none;
               padding:13px 32px;border-radius:12px;font-size:14px;font-weight:700;display:inline-block">
        Voir le détail par client →
      </a>
    </div>
    <p style="text-align:center;margin:8px 0 0;color:#3a3630;font-size:11px">
      DIPpro · <a href="${appUrl}/settings" style="color:#6a5f4a">Paramètres de l'automatisation</a>
    </p>
  </div>
</body></html>`;
}

// Compte-rendu de conformité programmé pour les avocats (fréquence et canal
// configurables par avocat, cf. PATCH /api/avocat/automation-settings).
// Réutilise computeLiveCompliance — pas de nouvel appel IA, donc pas de coût
// supplémentaire ni de dérive possible avec le score affiché sur le dashboard.
async function runAvocatDigests(appUrl, sendEmailFn) {
  const digestReport = { avocatsProcessed: 0, emailsSent: 0, errors: 0 };

  const { data: avocats } = await supabaseAdmin
    .from('users')
    .select('id, email, company_name, avocat_digest_frequency, avocat_digest_channel, avocat_digest_last_sent_at, resend_api_key, resend_sender_name, resend_sender_email')
    .eq('role', 'avocat')
    .neq('avocat_digest_frequency', 'off');

  const now = Date.now();

  for (const avocat of avocats || []) {
    try {
      const lastSent = avocat.avocat_digest_last_sent_at ? new Date(avocat.avocat_digest_last_sent_at).getTime() : 0;
      const elapsedHours = (now - lastSent) / 3_600_000;
      const due = avocat.avocat_digest_frequency === 'daily' ? elapsedHours >= 20 : elapsedHours >= 156; // ~6.5j pour weekly
      if (!due) continue;

      const { data: relations } = await supabaseAdmin
        .from('avocat_franchiseurs').select('franchiseur_id')
        .eq('avocat_id', avocat.id).eq('status', 'active');
      const franchiseurIds = (relations || []).map(r => r.franchiseur_id);
      if (!franchiseurIds.length) continue;

      const { data: franchiseurUsers } = await supabaseAdmin
        .from('users').select('id, company_name').in('id', franchiseurIds);
      const nameById = Object.fromEntries((franchiseurUsers || []).map(u => [u.id, u.company_name]));

      const { data: dips } = await supabaseAdmin
        .from('dip_documents')
        .select('id, user_id, dip_sections(section_number, section_title, status, legal_blocking)')
        .in('user_id', franchiseurIds).eq('status', 'actif');

      const dipByUser = {};
      (dips || []).forEach(d => { if (!dipByUser[d.user_id]) dipByUser[d.user_id] = d; });

      const summary = franchiseurIds.map(fid => {
        const dip = dipByUser[fid];
        if (!dip) return { franchiseur_id: fid, company_name: nameById[fid], score: null, level: null, issues: [] };
        const compliance = computeLiveCompliance(dip.dip_sections);
        const issues = (dip.dip_sections || [])
          .filter(s => s.status !== 'conforme')
          .sort((a, b) => a.section_number - b.section_number)
          .map(s => ({
            section_number: s.section_number,
            section_title: s.section_title,
            status: s.status,
            legal_reference: LEGAL_REFS[s.section_number - 1] || null,
          }));
        return { franchiseur_id: fid, company_name: nameById[fid], score: compliance.conformity_score, level: compliance.compliance_level, issues };
      });

      const scored = summary.map(s => s.score).filter(s => typeof s === 'number');
      const averageScore = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

      await supabaseAdmin.from('avocat_digests').insert({
        avocat_id: avocat.id,
        franchiseur_count: franchiseurIds.length,
        average_score: averageScore,
        summary,
      });

      if (avocat.avocat_digest_channel === 'email' || avocat.avocat_digest_channel === 'both') {
        const html = buildAvocatDigestHtml(avocat.company_name || '', summary, averageScore, appUrl);
        const sent = await sendEmailFn(
          avocat.email, avocat.company_name || '',
          `DIPpro — Compte-rendu de conformité du ${new Date().toLocaleDateString('fr-FR')}`,
          html, avocat
        );
        if (sent) digestReport.emailsSent++;
      }

      await supabaseAdmin.from('users').update({ avocat_digest_last_sent_at: new Date().toISOString() }).eq('id', avocat.id);
      digestReport.avocatsProcessed++;
    } catch (e) {
      console.error('[CRON DAILY] avocat digest error:', avocat.id, e.message);
      digestReport.errors++;
    }
  }

  return digestReport;
}

// GET /api/cron/daily — déclenché par Vercel Cron à 00h00 UTC
router.get('/daily', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startedAt = Date.now();
  const appUrl = getAppUrl();
  const report = { sourcesChecked: 0, usersNotified: 0, alertsCreated: 0, newsAnalyzed: 0, newsAlertsCreated: 0, errors: 0 };

  // Purge des emails saisis sans finalisation d'inscription, au-delà du
  // délai annoncé en politique de confidentialité (§5) — isolé dans son
  // propre try/catch pour qu'un échec ici ne bloque jamais le reste du cron.
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    await supabaseAdmin.from('waitlist_partial_emails').delete().lt('created_at', cutoff);
  } catch (err) {
    console.error('Purge waitlist_partial_emails:', err.message);
  }

  try {
    // ── 1. Récupérer toutes les sources de surveillance URL ──────────────────
    const { data: allSources, error: srcErr } = await supabaseAdmin
      .from('monitoring_sources')
      .select('*')
      .order('user_id');

    if (srcErr) throw srcErr;
    const sources = allSources || [];

    // ── 2. Traiter par batches parallèles ────────────────────────────────────
    const userChanges = {}; // { userId: [{ name, impactLevel, impactSummary }] }

    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      if (Date.now() - startedAt > MAX_RUN_MS) break; // sécurité timeout

      const batch = sources.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(s => checkOneSource(s)));

      results.forEach((r, idx) => {
        const source = batch[idx];
        report.sourcesChecked++;

        if (r.status === 'rejected') {
          report.errors++;
          return;
        }

        const { impactLevel, impactSummary, changeDetected, name } = r.value;
        if (impactLevel !== 'none') {
          if (!userChanges[source.user_id]) userChanges[source.user_id] = [];
          userChanges[source.user_id].push({ name, impactLevel, impactSummary });
        }
      });
    }

    // ── 3. Créer alertes in-app pour impacts critiques/élevés ───────────────
    const criticalUserIds = Object.entries(userChanges)
      .filter(([, changes]) => changes.some(c => c.impactLevel === 'critical' || c.impactLevel === 'high'))
      .map(([userId]) => userId);

    let alertsCreated = 0;
    if (criticalUserIds.length > 0) {
      const { data: activeDips } = await supabaseAdmin
        .from('dip_documents')
        .select('id, user_id')
        .in('user_id', criticalUserIds)
        .eq('status', 'actif');

      const dipByUser = Object.fromEntries((activeDips || []).map(d => [d.user_id, d.id]));

      const criticalEntries = Object.entries(userChanges)
        .flatMap(([userId, changes]) =>
          changes
            .filter(c => c.impactLevel === 'critical' || c.impactLevel === 'high')
            .map(c => ({
              user_id: userId,
              dip_id: dipByUser[userId] || null,
              type: 'monitoring_change',
              title: `Changement détecté : ${c.name}`,
              source: c.name,
              new_value: c.impactSummary,
              suggestion: c.impactSummary,
              urgency: c.impactLevel === 'critical' ? 'haute' : 'moyenne',
              status: 'pending',
            }))
        );

      if (criticalEntries.length > 0) {
        await supabaseAdmin.from('alerts').insert(criticalEntries);
        alertsCreated = criticalEntries.length;
      }
    }
    report.alertsCreated = alertsCreated;

    // ── 3b. Veille réglementaire (flux RSS partagés) ─────────────────────────
    // Contrairement aux sources personnalisées (par franchiseur), ces flux
    // sont publics et communs à tous — l'article n'est analysé QU'UNE FOIS
    // (mis en cache dans regulatory_news_cache), puis, s'il est jugé à impact
    // élevé/critique sur la conformité DIP, une alerte est créée pour chaque
    // franchiseur ayant un DIP actif.
    try {
      const { items: newsItems } = await fetchNewsItems();
      const newsIds = newsItems.map(i => i.id);
      const { data: cached } = newsIds.length
        ? await supabaseAdmin.from('regulatory_news_cache').select('id').in('id', newsIds)
        : { data: [] };
      const cachedIds = new Set((cached || []).map(c => c.id));
      const freshItems = newsItems.filter(i => !cachedIds.has(i.id));

      const highImpactItems = [];
      for (const item of freshItems) {
        if (Date.now() - startedAt > MAX_RUN_MS) break;
        try {
          const aiResponse = await anthropic.messages.create({
            model: 'claude-sonnet-5',
            max_tokens: 512,
            messages: [{
              role: 'user',
              content: `Tu es un expert en droit de la franchise française (Loi Doubin, art. L.330-3 et R.330-1 Code de commerce).

Titre : "${item.title}"
Source : ${item.source}
Extrait : ${item.summary || '(pas d\'extrait disponible)'}

Cet article peut-il avoir un impact sur la conformité d'un Document d'Information Précontractuelle (DIP) de franchise — évolution législative/réglementaire, nouvelle jurisprudence, tendance de marché significative, alerte sur une pratique du secteur ?

Réponds en JSON strict :
{"impact_level": "none|low|medium|high|critical", "impact_reason": "1 phrase expliquant pourquoi, ou null si none"}`
            }]
          });
          const raw = aiResponse.content.find(b => b.type === 'text')?.text?.trim() || '{}';
          const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
          const impact_level = parsed.impact_level || 'none';
          const impact_reason = parsed.impact_reason || null;

          await supabaseAdmin.from('regulatory_news_cache').insert({
            id: item.id, title: item.title, url: item.url, source: item.source,
            category: item.category, published_at: item.date || null,
            summary: item.summary, impact_level, impact_reason,
          });

          report.newsAnalyzed++;
          if (impact_level === 'high' || impact_level === 'critical') {
            highImpactItems.push({ ...item, impact_level, impact_reason });
          }
        } catch (e) {
          console.error('News analysis error:', e.message);
        }
      }

      if (highImpactItems.length > 0) {
        const { data: activeDips } = await supabaseAdmin
          .from('dip_documents').select('id, user_id').eq('status', 'actif');

        if (activeDips?.length) {
          const newsAlerts = activeDips.flatMap(dip =>
            highImpactItems.map(item => ({
              user_id: dip.user_id,
              dip_id: dip.id,
              type: 'regulatory_news',
              title: item.title,
              source: item.source,
              suggestion: `${item.impact_reason || 'Impact potentiel sur la conformité DIP.'} — ${item.url}`,
              urgency: item.impact_level === 'critical' ? 'haute' : 'moyenne',
              status: 'pending',
            }))
          );
          await supabaseAdmin.from('alerts').insert(newsAlerts);
          report.newsAlertsCreated = newsAlerts.length;
        }
      }
    } catch (e) {
      console.error('Regulatory news step error:', e.message);
    }

    // ── 4. Envoyer email digests ─────────────────────────────────────────────
    const userIdsWithChanges = Object.keys(userChanges);
    if (userIdsWithChanges.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('users')
        .select('id, email, company_name, notifications_email, resend_api_key, resend_sender_name, resend_sender_email')
        .in('id', userIdsWithChanges)
        .eq('notifications_email', true);

      for (const profile of profiles || []) {
        const changes = userChanges[profile.id];
        const html = buildDigestHtml(profile.company_name || '', changes, appUrl);
        const sent = await sendEmail(
          profile.email,
          profile.company_name || '',
          `DIPpro — Veille documentaire du ${new Date().toLocaleDateString('fr-FR')}`,
          html,
          profile
        );
        if (sent) report.usersNotified++;
      }
    }

    // ── 5. Comptes-rendus programmés des avocats ─────────────────────────────
    try {
      report.avocatDigests = await runAvocatDigests(appUrl, sendEmail);
    } catch (e) {
      console.error('Avocat digest step error:', e.message);
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    res.json({ ok: true, elapsed: `${elapsed}s`, ...report });

  } catch (err) {
    console.error('[CRON DAILY]', err.message);
    res.status(500).json({ ok: false, error: err.message, ...report });
  }
});

module.exports = router;
