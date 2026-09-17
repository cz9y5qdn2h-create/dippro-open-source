import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit etre utilise dans AuthProvider');
  return ctx;
}

const withTimeout = (promise, ms, fallback = null) => {
  // Si cette promesse perd la course (ex: le Lock Web "sb-...-auth-token"
  // lui est volé par un autre onglet/appel concurrent — cause du crash
  // "Lock was released because another request stole it"), son rejet
  // arrive APRÈS que Promise.race ait déjà tranché : personne ne
  // l'observe plus, et il remonte comme unhandledrejection. On l'attrape
  // ici pour de bon, indépendamment de l'issue de la course.
  promise.catch(() => {});
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

// L'appel Supabase le plus exposé aux locks volés (getSession() en
// interne) — jamais await brut ailleurs dans ce fichier : un timeout
// dégrade en "pas de palier A2F détecté côté client", et authMiddleware
// (backend) reste l'unique garde-fou réel sur aal2.
async function getAAL() {
  const result = await withTimeout(
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    3000,
    { data: null }
  );
  return result?.data || {};
}

const PROFILE_CACHE_KEY = 'dippro-profile-v1';

function getCachedProfile(userId) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const { id, data } = JSON.parse(raw);
    return id === userId ? data : null;
  } catch {
    return null;
  }
}

function setCachedProfile(userId, data) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ id: userId, data }));
  } catch {}
}

function clearCachedProfile() {
  localStorage.removeItem(PROFILE_CACHE_KEY);
}

// Le profil pilote tout l'affichage (rôle admin/avocat/franchiseur, essai).
// La lecture directe passe par le client anon et donc par RLS : si elle
// échoue ou dépasse le délai, on retombait silencieusement sur le profil en
// cache — potentiellement périmé pour toujours, ce qui fait « perdre »
// l'accès admin alors que le rôle est correct en base. Le backend
// (`/auth/me`, service role, sans RLS) est la source de vérité utilisée par
// les contrôles d'accès : on s'y replie systématiquement en cas d'échec,
// pour que l'interface ne diverge jamais de ce que le serveur autorise.
async function fetchProfile(userId) {
  try {
    const result = await withTimeout(
      supabase.from('users').select('*').eq('id', userId).single(),
      4000,
      { data: null }
    );
    const profile = result?.data || null;
    if (profile) {
      setCachedProfile(userId, profile);
      return profile;
    }
  } catch { /* on tente le repli backend ci-dessous */ }

  try {
    const { data } = await api.get('/auth/me');
    const profile = data?.user || null;
    if (profile?.id) {
      setCachedProfile(userId, profile);
      return profile;
    }
  } catch { /* hors ligne ou session expirée — le cache reste le dernier recours */ }

  return null;
}

function isTrialExpiredFn(profile) {
  if (!profile) return false;
  if (profile.role === 'admin' || profile.role === 'avocat') return false;
  if (profile.appointment_booked === true) return false;
  if (!profile.trial_expires_at) return false;
  return new Date() > new Date(profile.trial_expires_at);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const mfaPendingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          3000,
          { data: { session: null } }
        );
        const session = result?.data?.session;

        if (!mounted) return;

        if (session?.user) {
          const aalData = await getAAL();
          if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
            if (mounted) setLoading(false);
            return;
          }

          setUser(session.user);
          localStorage.setItem('access_token', session.access_token);

          // Afficher le profil caché immédiatement — l'UI s'affiche sans attendre Supabase
          const cached = getCachedProfile(session.user.id);
          if (cached && mounted) {
            setProfile(cached);
            setLoading(false);
          }

          // Fetch en background et mettre à jour si différent
          const fresh = await fetchProfile(session.user.id);
          if (mounted && fresh) setProfile(fresh);
          if (!cached && mounted) setLoading(false);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        try {
          if (event === 'PASSWORD_RECOVERY') {
            setNeedsPasswordReset(true);
            return;
          }

          if (event === 'SIGNED_IN' && !mfaPendingRef.current) {
            const aalData = await getAAL();
            if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
              return;
            }
          }

          if (mfaPendingRef.current && event === 'SIGNED_IN') {
            return;
          }

          if (session?.user) {
            setUser(session.user);
            localStorage.setItem('access_token', session.access_token);
            const p = await fetchProfile(session.user.id);
            // Une panne réseau ponctuelle ne doit pas effacer le rôle affiché
            // (l'utilisateur se retrouverait sans aucun accès) — on conserve
            // le dernier profil connu tant que la session reste valide.
            if (mounted && p) setProfile(p);
          } else {
            setUser(null);
            setProfile(null);
            clearCachedProfile();
            localStorage.removeItem('access_token');
          }
        } catch (err) {
          console.error('Auth state change error:', err);
        } finally {
          if (event !== 'INITIAL_SESSION' && mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    mfaPendingRef.current = true;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      mfaPendingRef.current = false;
      throw new Error('Identifiants invalides');
    }

    const aalData = await getAAL();
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find(f => f.status === 'verified');
      if (totpFactor) {
        return { mfaRequired: true, factorId: totpFactor.id };
      }
    }

    mfaPendingRef.current = false;
    localStorage.setItem('access_token', data.session.access_token);

    // Affiche le profil caché immédiatement — la redirection ne doit pas
    // attendre l'aller-retour réseau vers Supabase (jusqu'à 4s de timeout)
    const cached = getCachedProfile(data.user.id);
    if (cached) setProfile(cached);
    setUser(data.user);

    // Rafraîchit en arrière-plan, sans bloquer le retour de login()
    fetchProfile(data.user.id).then(p => { if (p) setProfile(p); });

    return data.user;
  };

  const verifyMFA = async (factorId, code) => {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) throw new Error('Code incorrect');
    mfaPendingRef.current = false;
    localStorage.setItem('access_token', data.session.access_token);

    const cached = getCachedProfile(data.user.id);
    if (cached) setProfile(cached);
    setUser(data.user);

    fetchProfile(data.user.id).then(p => { if (p) setProfile(p); });

    return data.user;
  };

  const register = async (email, password, company_name, phone_number, consentData = {}) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password, company_name, phone_number,
        marketing_consent: consentData.marketing_consent ?? false,
        ai_disclaimer_accepted: consentData.ai_disclaimer_accepted ?? false,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '2026-05-13',
        role: consentData.role || 'franchiseur',
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la création du compte');

    // Le compte est créé côté backend via l'API admin Supabase, qui n'ouvre
    // aucune session navigateur. Sans cette connexion explicite, l'écran
    // d'onboarding qui suit renvoie l'utilisateur sur la page d'accueil
    // publique (TrialGuard voit user=null) au lieu du tableau de bord — il
    // doit ensuite se reconnecter manuellement pour que quoi que ce soit
    // (dont un lien d'invitation avocat en attente) puisse aboutir.
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError && sessionData?.user) {
      localStorage.setItem('access_token', sessionData.session.access_token);
      const cached = getCachedProfile(sessionData.user.id);
      if (cached) setProfile(cached);
      setUser(sessionData.user);
      fetchProfile(sessionData.user.id).then(p => { if (p) setProfile(p); });
    }

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearCachedProfile();
    localStorage.removeItem('access_token');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  const isTrialExpired = isTrialExpiredFn(profile);

  const trialDaysLeft = (() => {
    if (!profile?.trial_expires_at || profile.role === 'admin' || profile.role === 'avocat' || profile.appointment_booked) return null;
    const diff = new Date(profile.trial_expires_at) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  })();

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, register, logout, refreshProfile, verifyMFA,
      supabase,
      isTrialExpired,
      trialDaysLeft,
      needsPasswordReset,
      clearPasswordReset: () => setNeedsPasswordReset(false)
    }}>
      {children}
    </AuthContext.Provider>
  );
}
