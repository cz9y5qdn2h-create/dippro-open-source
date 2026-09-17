const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// GET /api/history — Journal d'audit de l'utilisateur
router.get('/', authMiddleware, async (req, res) => {
  const { dip_id, limit = 100, offset = 0 } = req.query;

  // Récupérer les DIP IDs de l'utilisateur (filtre sécurisé côté DB)
  const { data: userDips } = await supabaseAdmin
    .from('dip_documents')
    .select('id')
    .eq('user_id', req.user.id);

  if (!userDips || userDips.length === 0) {
    return res.json({ history: [], total: 0 });
  }

  const dipIds = userDips.map(d => d.id);

  let query = supabaseAdmin
    .from('audit_log')
    .select('*, dip_documents(title), dip_sections(section_title)', { count: 'exact' })
    .in('dip_id', dipIds)
    .order('timestamp', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (dip_id) query = query.eq('dip_id', dip_id);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ history: data || [], total: count || 0 });
});

module.exports = router;
