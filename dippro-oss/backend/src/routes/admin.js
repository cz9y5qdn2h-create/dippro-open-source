const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, invalidateRoleCache } = require('../middleware/auth');
const { isPasswordPwned } = require('../utils/passwordSecurity');
const { getAppUrl } = require('../config/appUrl');
const router = express.Router();

// Middleware admin strict
const requireAdmin = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('users').select('role').eq('id', req.user.id).single();

    if (error && error.code !== 'PGRST116') {
      console.error('requireAdmin DB error:', error.message);
      return res.status(500).json({ error: 'Vérification du rôle impossible' });
    }

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin exception:', err.message);
    return res.status(500).json({ error: 'Erreur de vérification du rôle' });
  }
};

// GET /api/admin/stats — Vue globale
router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  const [
    { count: totalUsers },
    { count: totalDips },
    { count: totalFranchisees },
    { count: pendingAlerts }
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('dip_documents').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('franchisees').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ]);

  const { data: recentActivity } = await supabaseAdmin
    .from('audit_log').select('action, timestamp, user_id').order('timestamp', { ascending: false }).limit(10);

  const { data: dipScores } = await supabaseAdmin
    .from('dip_documents').select('conformity_score').eq('status', 'actif');

  const avgScore = dipScores?.length
    ? Math.round(dipScores.reduce((s, d) => s + (d.conformity_score || 0), 0) / dipScores.length)
    : 0;

  res.json({ totalUsers, totalDips, totalFranchisees, pendingAlerts, avgScore, recentActivity: recentActivity || [] });
});

// GET /api/admin/users — Liste tous les franchiseurs
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const from  = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('users')
    .select('id, email, role, company_name, created_at, siret, automation_level', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data, total: count, page, limit });
});

// GET /api/admin/users/:id — Détail d'un franchiseur
router.get('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { data: user } = await supabaseAdmin
    .from('users').select('*').eq('id', req.params.id).single();
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const { data: dips } = await supabaseAdmin
    .from('dip_documents').select('id, title, status, conformity_score, created_at')
    .eq('user_id', req.params.id).order('created_at', { ascending: false });

  const { data: franchisees } = await supabaseAdmin
    .from('franchisees').select('id, name, email, status')
    .eq('franchiseur_id', req.params.id);

  // La clé Resend est un secret personnel du franchiseur (Paramètres >
  // Emails) — l'admin n'a pas besoin de la lire pour gérer le compte.
  delete user.resend_api_key;

  res.json({ user, dips: dips || [], franchisees: franchisees || [] });
});

const ALLOWED_ROLES = ['franchiseur', 'admin', 'avocat'];

// PUT /api/admin/users/:id — Modifier un utilisateur
router.put('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { company_name, role, email } = req.body;
  const updates = {};
  if (company_name !== undefined) updates.company_name = String(company_name).substring(0, 200);
  if (role !== undefined) {
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    // Changer son propre rôle (ex: admin → avocat pour "tester") bascule
    // instantanément tout le compte sur l'autre visage du SaaS : données
    // franchiseur invisibles, accès admin perdu — vécu comme une perte de
    // données. Un admin ne peut modifier que le rôle des AUTRES comptes.
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Impossible de modifier le rôle de votre propre compte. Créez un compte de test séparé (ex: theo+avocat@...) pour essayer un autre rôle.' });
    }
    updates.role = role;
  }

  const { data, error } = await supabaseAdmin
    .from('users').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Sans invalidation, l'ancien rôle reste servi par le cache backend
  // jusqu'à 5 minutes après un changement — source de comportements
  // "incohérents" difficiles à diagnostiquer juste après une modification.
  if (updates.role) invalidateRoleCache(req.params.id);

  // Changer l'email si fourni
  if (email) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { email });
    if (authError) return res.status(500).json({ error: authError.message });
  }

  res.json({ user: data });
});

// POST /api/admin/users/:id/reset-password — Réinitialiser le mot de passe
router.post('/users/:id/reset-password', authMiddleware, requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });
  }

  const pwnedCheck = await isPasswordPwned(password);
  if (pwnedCheck.pwned) {
    return res.status(400).json({
      error: `Ce mot de passe a été trouvé dans ${pwnedCheck.count.toLocaleString('fr-FR')} fuites de données connues. Choisissez un mot de passe différent.`
    });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password });
  if (error) return res.status(500).json({ error: error.message });

  await supabaseAdmin.from('audit_log').insert({
    action: 'admin_password_reset',
    user_id: req.params.id,
    new_content: 'Mot de passe réinitialisé par admin',
    timestamp: new Date().toISOString()
  });

  res.json({ message: 'Mot de passe réinitialisé avec succès' });
});

// DELETE /api/admin/users/:id — Supprimer un compte
router.delete('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Compte supprimé' });
});

// POST /api/admin/users — Créer un compte franchiseur
router.post('/users', authMiddleware, requireAdmin, async (req, res) => {
  const { email, password, company_name, role = 'franchiseur' } = req.body;
  if (!email || !password || !company_name) {
    return res.status(400).json({ error: 'Email, mot de passe et société requis' });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true
  });
  if (authError) return res.status(400).json({ error: authError.message });

  // upsert : handle_new_user() a déjà inséré une ligne par défaut
  // (role='franchiseur') au moment de la création du compte auth.users —
  // un .insert() ici échouait silencieusement sur le conflit de clé primaire
  // et le rôle choisi ici n'était jamais réellement appliqué.
  const { data: profile } = await supabaseAdmin.from('users').upsert({
    id: authData.user.id, email, role, company_name, created_at: new Date().toISOString()
  }, { onConflict: 'id' }).select().single();

  res.status(201).json({ user: profile });
});

// GET /api/admin/dips — Tous les DIPs de tous les franchiseurs
router.get('/dips', authMiddleware, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('dip_documents')
    .select('*, users(company_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ dips: data });
});

// GET /api/admin/activity — Journal d'activité global
router.get('/activity', authMiddleware, requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('audit_log')
    .select('*, users(email, company_name)')
    .order('timestamp', { ascending: false })
    .limit(50);
  res.json({ activity: data || [] });
});

// ─── Comptes avocat — création et accès simplifié ──────────────────────────
// L'admin crée directement un compte avocat (sans mot de passe : l'accès se
// fait uniquement via le lien permanent renvoyé ici) et peut le lier
// immédiatement à un ou plusieurs franchiseurs, sans passer par le circuit
// d'invitation propre à chaque franchiseur.

// GET /api/admin/avocats — liste des comptes avocat + franchiseurs liés
router.get('/avocats', authMiddleware, requireAdmin, async (req, res) => {
  const { data: avocats, error } = await supabaseAdmin
    .from('users')
    .select('id, email, company_name, created_at, avocat_access_token')
    .eq('role', 'avocat')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const ids = (avocats || []).map(a => a.id);
  let relations = [];
  if (ids.length) {
    const { data } = await supabaseAdmin
      .from('avocat_franchiseurs')
      .select('avocat_id, franchiseur_id, status, franchiseur:users!franchiseur_id(id, company_name)')
      .in('avocat_id', ids)
      .eq('status', 'active');
    relations = data || [];
  }

  const appUrl = getAppUrl();
  const enriched = (avocats || []).map(a => ({
    ...a,
    access_url: a.avocat_access_token ? `${appUrl}/api/auth/avocat-login/${a.avocat_access_token}` : null,
    franchiseurs: relations.filter(r => r.avocat_id === a.id).map(r => r.franchiseur),
  }));

  res.json({ avocats: enriched });
});

// POST /api/admin/avocats — créer (ou compléter) un compte avocat
router.post('/avocats', authMiddleware, requireAdmin, async (req, res) => {
  const { email, company_name, franchiseur_ids = [] } = req.body;
  if (!email?.trim() || !company_name?.trim()) {
    return res.status(400).json({ error: 'Email et nom du cabinet requis' });
  }
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing } = await supabaseAdmin
    .from('users').select('id, role, avocat_access_token').eq('email', normalizedEmail).maybeSingle();
  if (existing && existing.role !== 'avocat') {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email sous un autre rôle.' });
  }

  let userId = existing?.id;
  if (!userId) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail, email_confirm: true,
    });
    if (authError) return res.status(400).json({ error: authError.message });
    userId = authData.user.id;
  }

  const accessToken = existing?.avocat_access_token || uuidv4();
  const upsertPayload = {
    id: userId, email: normalizedEmail, role: 'avocat', company_name: company_name.trim(),
    trial_expires_at: null, avocat_access_token: accessToken,
  };
  if (!existing) upsertPayload.created_at = new Date().toISOString();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users').upsert(upsertPayload, { onConflict: 'id' }).select().single();
  if (profileError) return res.status(500).json({ error: profileError.message });

  if (Array.isArray(franchiseur_ids) && franchiseur_ids.length) {
    const now = new Date().toISOString();
    for (const franchiseurId of franchiseur_ids) {
      const { data: relExisting } = await supabaseAdmin
        .from('avocat_franchiseurs').select('id, status')
        .eq('avocat_id', userId).eq('franchiseur_id', franchiseurId).maybeSingle();
      if (relExisting) {
        if (relExisting.status !== 'active') {
          await supabaseAdmin.from('avocat_franchiseurs')
            .update({ status: 'active', accepted_at: now }).eq('id', relExisting.id);
        }
      } else {
        await supabaseAdmin.from('avocat_franchiseurs').insert({
          avocat_id: userId, franchiseur_id: franchiseurId, status: 'active', invited_at: now, accepted_at: now,
        });
      }
    }
  }

  res.status(201).json({ user: profile, access_url: `${getAppUrl()}/api/auth/avocat-login/${accessToken}` });
});

// POST /api/admin/avocats/:id/regenerate-link — révoque l'ancien lien, en émet un nouveau
router.post('/avocats/:id/regenerate-link', authMiddleware, requireAdmin, async (req, res) => {
  const { data: user } = await supabaseAdmin.from('users').select('id, role').eq('id', req.params.id).maybeSingle();
  if (!user || user.role !== 'avocat') return res.status(404).json({ error: 'Compte avocat introuvable' });

  const accessToken = uuidv4();
  const { error } = await supabaseAdmin.from('users').update({ avocat_access_token: accessToken }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ access_url: `${getAppUrl()}/api/auth/avocat-login/${accessToken}` });
});

// POST /api/admin/avocats/:id/franchiseurs — lier un avocat existant à un franchiseur (admin bypass)
router.post('/avocats/:id/franchiseurs', authMiddleware, requireAdmin, async (req, res) => {
  const { franchiseur_id } = req.body;
  if (!franchiseur_id) return res.status(400).json({ error: 'franchiseur_id requis' });

  const { data: avocat } = await supabaseAdmin.from('users').select('id, role').eq('id', req.params.id).maybeSingle();
  if (!avocat || avocat.role !== 'avocat') return res.status(404).json({ error: 'Compte avocat introuvable' });

  const now = new Date().toISOString();
  const { data: relExisting } = await supabaseAdmin
    .from('avocat_franchiseurs').select('id, status')
    .eq('avocat_id', req.params.id).eq('franchiseur_id', franchiseur_id).maybeSingle();

  if (relExisting) {
    if (relExisting.status !== 'active') {
      await supabaseAdmin.from('avocat_franchiseurs')
        .update({ status: 'active', accepted_at: now }).eq('id', relExisting.id);
    }
  } else {
    await supabaseAdmin.from('avocat_franchiseurs').insert({
      avocat_id: req.params.id, franchiseur_id, status: 'active', invited_at: now, accepted_at: now,
    });
  }

  res.json({ success: true });
});

// DELETE /api/admin/avocats/:id/franchiseurs/:franchiseurId — délier
router.delete('/avocats/:id/franchiseurs/:franchiseurId', authMiddleware, requireAdmin, async (req, res) => {
  await supabaseAdmin.from('avocat_franchiseurs')
    .delete().eq('avocat_id', req.params.id).eq('franchiseur_id', req.params.franchiseurId);
  res.json({ success: true });
});

module.exports = router;
