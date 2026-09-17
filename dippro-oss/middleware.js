// Routing Middleware Vercel — corrige le soft-404 : sans ceci, toute URL
// inconnue (ex. /this-page-does-not-exist) est réécrite vers index.html par
// le rewrite catch-all de vercel.json et répond HTTP 200, ce qui trompe les
// moteurs de recherche et les outils d'audit SEO. Cette fonction s'exécute
// avant les rewrites : elle laisse passer tout ce qui est légitime (API,
// assets, blog statique, fichiers publics, routes connues de l'app React) et
// renvoie un vrai 404 pour le reste.
//
// Toute nouvelle route ajoutée dans frontend/src/App.jsx doit avoir son
// premier segment de chemin ajouté à ALLOWED_PREFIXES ci-dessous, sinon elle
// sera bloquée par erreur.
const ALLOWED_PREFIXES = new Set([
  '', // "/"
  'cgu', 'privacy', 'mentions-legales', 'cookies',
  'login', 'register', 'forgot-password', 'reset-password',
  'waitlist', 'trial-expired', 'ressources',
  'dip', 'contrat', 'avocat', 'attestation',
  'dashboard', 'fichiers', 'alerts', 'history', 'franchisees', 'settings',
  'export', 'certifications', 'conformite', 'documents', 'admin',
  'monitor', 'monitoring', 'analytics', 'design-preview',
]);

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  // API, assets buildés, blog statique généré à part : jamais concernés.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/blog')
  ) {
    return;
  }

  // Tout chemin avec une extension (favicon.svg, robots.txt, sitemap.xml,
  // og-image.png, fichier de vérification Google, source maps, etc.) est un
  // fichier statique servi directement — jamais une route applicative.
  const lastSegment = pathname.split('/').pop();
  if (lastSegment && lastSegment.includes('.')) {
    return;
  }

  const firstSegment = pathname.split('/')[1] || '';
  if (ALLOWED_PREFIXES.has(firstSegment)) {
    return;
  }

  return new Response('Not Found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
