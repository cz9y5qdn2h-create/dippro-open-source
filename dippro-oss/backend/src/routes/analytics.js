const express = require('express');
const rateLimit = require('express-rate-limit');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const router = express.Router();

const SECTION_TITLES = {
  1: 'Identité du franchiseur',
  2: 'Historique du réseau',
  3: 'État du réseau',
  4: 'Comptes annuels',
  5: 'Marques & propriété intellectuelle',
  6: 'Informations financières',
  7: 'Territoire exclusif',
  8: 'Durée & renouvellement',
  9: 'Litiges',
  10: 'Prévisionnels',
};

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.body?.visit_id || req.ip,
  message: { error: 'Trop de requêtes' },
});

// POST /api/analytics/read — public (appelé par sendBeacon depuis SharedDIPPage)
router.post('/read', readLimiter, async (req, res) => {
  const { dip_id, share_token, visit_id, events } = req.body;

  if (!dip_id || !share_token || !visit_id || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }
  if (events.length > 15) {
    return res.status(400).json({ error: 'Trop d\'événements par lot' });
  }

  const { data: doc } = await supabaseAdmin
    .from('dip_documents')
    .select('id')
    .eq('id', dip_id)
    .eq('share_token', share_token)
    .single();

  if (!doc) return res.status(404).json({ error: 'Document introuvable' });

  const toInsert = events
    .filter(e =>
      Number.isInteger(e.section_number) && e.section_number >= 1 && e.section_number <= 10 &&
      Number.isInteger(e.time_spent_s) && e.time_spent_s > 0 && e.time_spent_s <= 3600 &&
      Number.isInteger(e.scroll_depth_pct) && e.scroll_depth_pct >= 0 && e.scroll_depth_pct <= 100
    )
    .map(e => ({
      dip_id,
      share_token,
      visit_id: String(visit_id).substring(0, 64),
      section_number: e.section_number,
      time_spent_s: e.time_spent_s,
      scroll_depth_pct: e.scroll_depth_pct,
    }));

  if (toInsert.length === 0) return res.json({ ok: true, recorded: 0 });

  const { error } = await supabaseAdmin.from('dip_reads').insert(toInsert);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, recorded: toInsert.length });
});

// GET /api/analytics/dip/:dipId — franchiseur authentifié
router.get('/dip/:dipId', authMiddleware, requireFranchisor, async (req, res) => {
  const { dipId } = req.params;

  const { data: doc } = await supabaseAdmin
    .from('dip_documents')
    .select('id, title')
    .eq('id', dipId)
    .eq('user_id', req.user.id)
    .single();

  if (!doc) return res.status(404).json({ error: 'DIP introuvable' });

  const { data: reads, error } = await supabaseAdmin
    .from('dip_reads')
    .select('*')
    .eq('dip_id', dipId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const empty = {
    dip_title: doc.title,
    total_visits: 0,
    avg_time_total_s: 0,
    last_visit_at: null,
    sections: Array.from({ length: 10 }, (_, i) => ({
      section_number: i + 1,
      section_title: SECTION_TITLES[i + 1],
      total_opens: 0,
      avg_time_s: 0,
      avg_scroll_pct: 0,
      open_rate_pct: 0,
    })),
    visits: [],
  };

  if (!reads?.length) return res.json(empty);

  // Agrégation par visite
  const visitMap = {};
  for (const r of reads) {
    if (!visitMap[r.visit_id]) {
      visitMap[r.visit_id] = { visit_id: r.visit_id, first_seen_at: r.created_at, sections_opened: new Set(), total_time_s: 0 };
    } else if (r.created_at < visitMap[r.visit_id].first_seen_at) {
      visitMap[r.visit_id].first_seen_at = r.created_at;
    }
    visitMap[r.visit_id].sections_opened.add(r.section_number);
    visitMap[r.visit_id].total_time_s += r.time_spent_s;
  }

  const visits = Object.values(visitMap)
    .sort((a, b) => new Date(b.first_seen_at) - new Date(a.first_seen_at))
    .slice(0, 100)
    .map(v => ({
      visit_id: v.visit_id,
      first_seen_at: v.first_seen_at,
      sections_opened: Array.from(v.sections_opened).sort((a, b) => a - b),
      total_time_s: v.total_time_s,
    }));

  const totalVisits = visits.length;

  // Agrégation par section
  const sectionMap = {};
  for (let i = 1; i <= 10; i++) sectionMap[i] = { total_opens: 0, total_time_s: 0, total_scroll: 0 };
  for (const r of reads) {
    sectionMap[r.section_number].total_opens++;
    sectionMap[r.section_number].total_time_s += r.time_spent_s;
    sectionMap[r.section_number].total_scroll += r.scroll_depth_pct;
  }

  const sections = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    const s = sectionMap[n];
    return {
      section_number: n,
      section_title: SECTION_TITLES[n],
      total_opens: s.total_opens,
      avg_time_s: s.total_opens > 0 ? Math.round(s.total_time_s / s.total_opens) : 0,
      avg_scroll_pct: s.total_opens > 0 ? Math.round(s.total_scroll / s.total_opens) : 0,
      open_rate_pct: totalVisits > 0 ? Math.round((s.total_opens / totalVisits) * 100) : 0,
    };
  });

  const avgTotalTime = Math.round(visits.reduce((s, v) => s + v.total_time_s, 0) / totalVisits);

  res.json({
    dip_title: doc.title,
    total_visits: totalVisits,
    avg_time_total_s: avgTotalTime,
    last_visit_at: reads[0]?.created_at || null,
    sections,
    visits,
  });
});

module.exports = router;
