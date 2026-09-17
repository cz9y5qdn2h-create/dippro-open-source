import { isSupabaseLockStolenError, recoverFromChunkError } from './chunkRecovery';

const JOURNAL_KEY = 'dippro-error-journal';
const MAX_ENTRIES = 30;

// Empêche d'envoyer 50 fois la même erreur dans une session
const sentSignatures = new Set();

function signature(entry) {
  return `${entry.type}::${(entry.message || '').slice(0, 120)}::${(entry.stack || '').slice(0, 80)}`;
}

export function getJournal() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearJournal() {
  localStorage.removeItem(JOURNAL_KEY);
}

function persist(entry) {
  try {
    const journal = getJournal();
    journal.unshift(entry);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal.slice(0, MAX_ENTRIES)));
  } catch {}
}

async function report(entry) {
  const sig = signature(entry);
  if (sentSignatures.has(sig)) return;
  sentSignatures.add(sig);

  try {
    const token = localStorage.getItem('access_token');
    await fetch('/api/bugs/client-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({
        message: entry.message,
        stack: entry.stack,
        component_stack: entry.componentStack,
        page_url: entry.url,
        error_type: entry.type,
      }),
      keepalive: true,
    });
  } catch {}
}

export function logError(error, { type = 'error', componentStack = null } = {}) {
  const entry = {
    type,
    message: error?.message || String(error || 'Erreur inconnue'),
    stack: error?.stack || null,
    componentStack: componentStack || null,
    url: typeof window !== 'undefined' ? window.location.href : '',
    at: new Date().toISOString(),
  };

  console.error(`[errorJournal:${type}]`, entry.message, error);
  persist(entry);
  report(entry);
  return entry;
}

let installed = false;

export function installGlobalErrorHandlers() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    // "Script error." sans e.error : signature du masquage cross-origin du
    // navigateur (script tiers, extension, bloqueur de pub) — jamais notre
    // propre code, qui est servi en same-origin. Le stack trace produit dans
    // ce cas ne pointe que vers l'appel new Error() ci-dessous, jamais vers
    // la vraie source : remonté en "BLOQUANT" sans aucune valeur de
    // diagnostic, juste du bruit d'alerte. Trouvé le 23/08/2026 après un
    // rapport "[CRASH AUTO] window.error : Script error." sur /login,
    // stack trace pointant dans le bundle applicatif lui-même.
    if (!e.error && e.message === 'Script error.') return;
    // Erreurs de chargement de ressource (script/img) : e.error est souvent null
    if (e.error) {
      logError(e.error, { type: 'window.error' });
    } else if (e.message) {
      logError(new Error(e.message), { type: 'window.error' });
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const error = reason instanceof Error ? reason : new Error(String(reason));

    // Course interne supabase-js (Web Locks API) entre onglets/appels
    // concurrents — bénigne et transitoire (le rafraîchissement automatique
    // de session retente au prochain tick), et déjà filtrée en interne par
    // supabase-js quand elle vient de sa propre boucle de rafraîchissement.
    // Seuls nos appels directs (getSession, MFA...) laissent parfois
    // échapper ce rejet : on l'empêche de polluer la console et on ne la
    // remonte pas comme un bug bloquant à chaque occurrence.
    if (isSupabaseLockStolenError(error)) {
      e.preventDefault();
      console.debug('[errorJournal] Supabase lock contention ignorée (transitoire) :', error.message);
      return;
    }

    logError(error, { type: 'unhandledrejection' });
  });

  // Échec de préchargement d'un chunk lazy après un redéploiement Vercel —
  // Vite émet cet événement AVANT que l'erreur ne se propage et fasse
  // planter le rendu React ; le seul fait de logger ne réparait rien pour
  // l'utilisateur, d'où l'ajout du rechargement automatique ici même.
  window.addEventListener('vite:preloadError', (e) => {
    logError(e.payload || new Error('vite:preloadError'), { type: 'chunk-load' });
    if (recoverFromChunkError()) e.preventDefault();
  });
}
