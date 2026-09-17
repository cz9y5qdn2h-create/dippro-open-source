require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

// Cache rôle en mémoire — évite 1 requête DB par requête protégée
const roleCache = new Map();
const ROLE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedRole(userId) {
  const entry = roleCache.get(userId);
  if (entry && Date.now() < entry.exp) return entry.role;
  roleCache.delete(userId);
  return null;
}

function setCachedRole(userId, role) {
  roleCache.set(userId, { role, exp: Date.now() + ROLE_TTL });
  if (roleCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of roleCache) if (now > v.exp) roleCache.delete(k);
  }
}

function invalidateRoleCache(userId) {
  roleCache.delete(userId);
}

// Cache statut MFA — évite un appel listFactors() par requête. Un token émis
// avant l'activation de l'A2F ne servira jamais plus de MFA_TTL sans être
// re-vérifié auprès de Supabase.
const mfaCache = new Map();
const MFA_TTL = 5 * 60 * 1000;

function getCachedMfaRequired(userId) {
  const entry = mfaCache.get(userId);
  if (entry && Date.now() < entry.exp) return entry.required;
  mfaCache.delete(userId);
  return null;
}

function setCachedMfaRequired(userId, required) {
  mfaCache.set(userId, { required, exp: Date.now() + MFA_TTL });
  if (mfaCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of mfaCache) if (now > v.exp) mfaCache.delete(k);
  }
}

function invalidateMfaCache(userId) {
  mfaCache.delete(userId);
}

// Décode le payload d'un JWT sans revérifier la signature — la signature et
// l'expiration ont déjà été validées par supabaseAdmin.auth.getUser(token)
// juste avant l'appel de cette fonction.
function decodeJwtClaims(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification manquant' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.length > 4096) {
    return res.status(401).json({ error: 'Token invalide' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
    }

    // Vérification réelle de l'A2F : un token émis avant la validation du
    // second facteur (aal1) ne doit jamais donner accès à l'API si
    // l'utilisateur a un facteur MFA vérifié enregistré. Sans ce contrôle,
    // le MFA n'est qu'un écran côté frontend — un token aal1 intercepté ou
    // obtenu directement via l'API Auth de Supabase contournerait totalement
    // la vérification en deux étapes.
    const claims = decodeJwtClaims(token);
    const aal = claims?.aal || 'aal1';

    if (aal !== 'aal2') {
      let mfaRequired = getCachedMfaRequired(user.id);
      if (mfaRequired === null) {
        try {
          const { data: factorsData, error: mfaError } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user.id });
          if (mfaError) throw mfaError;
          mfaRequired = (factorsData?.factors || []).some(f => f.status === 'verified');
          setCachedMfaRequired(user.id, mfaRequired);
        } catch (mfaErr) {
          // Panne transitoire de l'API admin Supabase : ne bloque pas tout le
          // service pour un incident réseau ponctuel. Pas de cache posé —
          // la vérification sera retentée à la prochaine requête.
          console.error('MFA check failed (fail-open):', mfaErr.message);
          mfaRequired = false;
        }
      }
      if (mfaRequired) {
        return res.status(401).json({ error: 'Vérification en deux étapes requise.', code: 'MFA_REQUIRED' });
      }
    }

    req.user = { id: user.id, email: user.email || '', user_metadata: user.user_metadata || {} };
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré. Reconnectez-vous.' });
  }
};

const requireFranchisor = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });

  // 1. Vérifier le cache — un cache qui AUTORISE peut être servi tel quel,
  // mais un cache qui REFUSE ne doit jamais bloquer sans revérification :
  // un rôle corrigé directement en base (support, migration) laissait sinon
  // l'utilisateur verrouillé jusqu'à 5 minutes sur « Accès réservé aux
  // franchiseurs ». Chemin rare, donc une lecture DB de plus est sans coût.
  const cached = getCachedRole(req.user.id);
  if (cached === 'franchiseur' || cached === 'admin') return next();
  if (cached) invalidateRoleCache(req.user.id);

  try {
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('requireFranchisor DB error:', profileError.message);
      return res.status(503).json({ error: 'Service temporairement indisponible.' });
    }

    if (!profile) {
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: req.user.id,
          email: req.user.email,
          role: 'franchiseur',
          company_name: req.user.user_metadata?.company_name || req.user.email.split('@')[0],
          created_at: new Date().toISOString()
        })
        .select('role')
        .single();

      if (insertError) {
        console.error('Auto-create profile error:', insertError.message);
        return res.status(500).json({ error: 'Impossible de créer le profil utilisateur.' });
      }
      profile = newProfile;
    }

    setCachedRole(req.user.id, profile.role);

    if (profile.role !== 'franchiseur' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux franchiseurs.' });
    }

    next();
  } catch (err) {
    console.error('requireFranchisor error:', err.message);
    return res.status(500).json({ error: 'Erreur de vérification du rôle' });
  }
};

module.exports = { authMiddleware, requireFranchisor, invalidateRoleCache, invalidateMfaCache };
