const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const { resolveScopedUserId } = require('../middleware/avocatScope');
const { fetchNewsItems } = require('../config/newsFeeds');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET /api/monitoring/sources
router.get('/sources', authMiddleware, async (req, res) => {
  try {
    const scopedUserId = await resolveScopedUserId(req);
    if (!scopedUserId) return res.status(403).json({ error: 'Accès refusé' });

    const { data, error } = await supabaseAdmin
      .from('monitoring_sources')
      .select('*, monitoring_results(id, impact_level, change_detected, checked_at)')
      .eq('user_id', scopedUserId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/monitoring/sources
router.post('/sources', authMiddleware, requireFranchisor, async (req, res) => {
  const { name, url, description, keywords } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name et url requis' });
  try {
    const { data, error } = await supabaseAdmin
      .from('monitoring_sources')
      .insert({ user_id: req.user.id, name, url, description, keywords: keywords || [] })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/monitoring/sources/:id
router.delete('/sources/:id', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('monitoring_sources')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/monitoring/check/:sourceId
router.post('/check/:sourceId', authMiddleware, requireFranchisor, async (req, res) => {
  try {
    const { data: source, error: srcErr } = await supabaseAdmin
      .from('monitoring_sources')
      .select('*')
      .eq('id', req.params.sourceId)
      .eq('user_id', req.user.id)
      .single();
    if (srcErr || !source) return res.status(404).json({ error: 'Source introuvable' });

    let content = '';
    let fetchError = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DIPpro-Monitor/1.0' }
      });
      clearTimeout(timeout);
      const html = await response.text();
      content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000);
    } catch (e) {
      fetchError = e.message;
      content = '';
    }

    const contentHash = content ? Buffer.from(content).toString('base64').slice(0, 64) : '';
    const changeDetected = source.last_content_hash !== null && source.last_content_hash !== contentHash;

    let impactLevel = 'none';
    let impactSummary = null;
    let impactDetail = null;

    if (content && (!source.last_content_hash || changeDetected)) {
      const keywords = source.keywords?.length > 0 ? source.keywords.join(', ') : 'franchise, DIP, Loi Doubin';
      const aiResponse = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Tu es un expert en droit de la franchise française (Loi Doubin, art. L.330-3 Code de commerce).

Analyse ce contenu web extrait de "${source.url}" :

---
${content.slice(0, 6000)}
---

Mots-clés à surveiller : ${keywords}

Réponds en JSON avec exactement ce format :
{
  "impact_level": "none|low|medium|high|critical",
  "impact_summary": "Résumé court (1 phrase) de l'impact potentiel sur un DIP franchise",
  "impact_detail": "Explication détaillée (2-3 phrases) si impact > none, sinon null",
  "change_relevant": true/false
}

- "none" : aucune information pertinente pour un DIP
- "low" : information marginalement pertinente
- "medium" : changement notable qui pourrait nécessiter une mise à jour
- "high" : changement important qui nécessite probablement une révision du DIP
- "critical" : changement réglementaire ou légal qui impose une mise à jour immédiate du DIP`
        }]
      });

      try {
        const rawJson = aiResponse.content[0].text.trim();
        const parsed = JSON.parse(rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
        impactLevel = parsed.impact_level || 'none';
        impactSummary = parsed.impact_summary;
        impactDetail = parsed.impact_detail;
      } catch {
        impactLevel = 'low';
        impactSummary = 'Contenu récupéré — analyse manuelle recommandée';
      }
    } else if (fetchError) {
      impactLevel = 'none';
      impactSummary = `Impossible de récupérer la page : ${fetchError}`;
    }

    const { data: result, error: resErr } = await supabaseAdmin
      .from('monitoring_results')
      .insert({
        source_id: source.id,
        user_id: req.user.id,
        change_detected: changeDetected,
        impact_level: impactLevel,
        impact_summary: impactSummary,
        impact_detail: impactDetail,
        content_snippet: content.slice(0, 500) || null
      })
      .select()
      .single();
    if (resErr) throw resErr;

    await supabaseAdmin
      .from('monitoring_sources')
      .update({
        last_checked_at: new Date().toISOString(),
        last_content_hash: contentHash || source.last_content_hash,
        updated_at: new Date().toISOString()
      })
      .eq('id', source.id);

    res.json({ result, changeDetected, fetchError: fetchError || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/monitoring/news — flux d'actualités franchise/juridique, enrichi
// du niveau d'impact DIP déjà analysé par le cron (regulatory_news_cache) —
// l'analyse elle-même ne se fait jamais à la demande (coût IA), seulement en
// tâche de fond périodique.
router.get('/news', authMiddleware, async (req, res) => {
  const { items, feedsOk, feedsTotal } = await fetchNewsItems();

  const ids = items.map(i => i.id);
  const { data: analyzed } = ids.length
    ? await supabaseAdmin.from('regulatory_news_cache').select('id, impact_level, impact_reason').in('id', ids)
    : { data: [] };
  const impactById = Object.fromEntries((analyzed || []).map(a => [a.id, a]));

  const enriched = items.map(i => ({
    ...i,
    impact_level: impactById[i.id]?.impact_level || null,
    impact_reason: impactById[i.id]?.impact_reason || null,
  }));

  res.json({ items: enriched, feedsOk, feedsTotal });
});

// GET /api/monitoring/results
router.get('/results', authMiddleware, async (req, res) => {
  try {
    const scopedUserId = await resolveScopedUserId(req);
    if (!scopedUserId) return res.status(403).json({ error: 'Accès refusé' });

    const { data, error } = await supabaseAdmin
      .from('monitoring_results')
      .select('*, monitoring_sources(name, url)')
      .eq('user_id', scopedUserId)
      .order('checked_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
