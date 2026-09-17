// Un chunk JS périmé après un redéploiement Vercel se manifeste différemment
// selon le moteur du navigateur — le rewrite catch-all de vercel.json renvoie
// index.html (200) pour un fichier .js qui n'existe plus depuis le nouveau
// déploiement, et chaque moteur décrit l'échec de parsing avec ses propres
// mots :
//  - Chromium/V8   : "Failed to fetch dynamically imported module", "Loading chunk X failed"
//  - Firefox       : "error loading dynamically imported module"
//  - Safari/WebKit : "'text/html' is not a valid JavaScript MIME type for module script '<url>'."
// Un seul et même bug de fond, trois signatures de message différentes.
export function isChunkLoadError(error) {
  const message = error?.message || '';
  return (
    error?.name === 'ChunkLoadError' ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('is not a valid JavaScript MIME type for module script')
  );
}

// Un seul rechargement automatique par route (pas un flag global) — sinon un
// chunk périmé rencontré sur une page consomme la seule tentative
// disponible, laissant toute autre page qui rencontre le même souci ensuite
// bloquée sans recharger. Retourne true si un rechargement a été déclenché.
export function recoverFromChunkError() {
  if (typeof window === 'undefined') return false;
  const reloadKey = `chunk-reload:${window.location.pathname}`;
  if (sessionStorage.getItem(reloadKey)) return false;
  sessionStorage.setItem(reloadKey, '1');
  window.location.reload();
  return true;
}

// "Lock was released because another request stole it" / NavigatorLockAcquireTimeoutError
// — course interne à supabase-js (Web Locks API) entre onglets/appels
// concurrents sur le même jeton de session. La boucle de rafraîchissement
// automatique de supabase-js filtre déjà ce cas en interne et retente au
// prochain tick (~30s) ; seuls NOS appels directs (getSession, MFA...) qui
// perdent cette course laissent échapper un rejet non traité. Bénin et
// transitoire — inutile de le remonter comme un bug bloquant à chaque fois.
export function isSupabaseLockStolenError(error) {
  const message = error?.message || '';
  return (
    error?.name === 'NavigatorLockAcquireTimeoutError' ||
    error?.isAcquireTimeout === true ||
    (message.includes('Lock') && (message.includes('stolen') || message.includes('released because another request')))
  );
}
