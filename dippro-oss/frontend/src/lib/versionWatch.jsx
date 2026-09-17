import toast from 'react-hot-toast';

// Détecte qu'un nouveau déploiement Vercel a eu lieu pendant qu'un onglet
// était resté ouvert. Chaque déploiement change le hash de fingerprint de
// tous les fichiers JS (Vite) — un onglet déjà ouvert qui navigue ensuite
// vers une route pas encore chargée référence un chunk qui n'existe plus
// (404 → HTML de secours → "n'est pas un type MIME JavaScript valide").
// chunkRecovery.js répare cet onglet APRÈS le crash ; ce module l'évite en
// amont en proposant un rechargement dès qu'une nouvelle version est
// détectée, avant que l'utilisateur ne heurte le problème en navigant.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function extractMainBundleRef(html) {
  const match = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
  return match ? match[0] : null;
}

let currentRef = null;
let notified = false;

function notifyNewVersion() {
  if (notified) return;
  notified = true;
  toast((t) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      Nouvelle version disponible
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'rgb(var(--gold))', color: '#1a1408', border: 'none',
          borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}
      >
        Recharger
      </button>
    </span>
  ), { duration: Infinity, id: 'new-version-available' });
}

async function checkForNewVersion() {
  if (notified || document.hidden || typeof fetch === 'undefined') return;
  try {
    const res = await fetch('/', { cache: 'no-store' });
    const html = await res.text();
    const ref = extractMainBundleRef(html);
    if (ref && currentRef && ref !== currentRef) notifyNewVersion();
  } catch {
    // Pas de réseau / offline — on retentera au prochain intervalle
  }
}

let installed = false;

export function installVersionWatch() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  currentRef = extractMainBundleRef(document.documentElement.outerHTML);
  if (!currentRef) return; // build sans le manifeste attendu (dev local) — rien à surveiller

  setInterval(checkForNewVersion, CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForNewVersion();
  });
}
