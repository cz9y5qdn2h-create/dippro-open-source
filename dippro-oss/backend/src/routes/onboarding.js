const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { role } = req.body;

  if (role === 'franchiseur') {
    const { nb_franchisees, has_existing_dip, lawyer_email } = req.body;

    const updates = { onboarding_completed: true };
    if (nb_franchisees !== undefined) updates.nb_franchisees = parseInt(nb_franchisees, 10) || null;
    if (has_existing_dip !== undefined) updates.has_existing_dip = Boolean(has_existing_dip);
    // lawyer_email n'est ici que pré-rempli pour Réglages > Partager avec mon
    // avocat — l'invitation elle-même reste la seule source de vérité pour
    // accorder l'accès, jamais une simple correspondance d'email (qui
    // laissait des relations "pending" bloquées à vie).
    if (lawyer_email) updates.lawyer_email = lawyer_email.trim().toLowerCase();

    const { error } = await supabaseAdmin.from('users').update(updates).eq('id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  }

  if (role === 'avocat') {
    const { nb_networks } = req.body;

    const updates = { onboarding_completed: true };
    if (nb_networks !== undefined) updates.avocat_nb_networks = parseInt(nb_networks, 10) || null;

    const { error } = await supabaseAdmin.from('users').update(updates).eq('id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Rôle invalide' });
});

module.exports = router;
