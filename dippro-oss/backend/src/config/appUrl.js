// Résout l'URL publique de l'application pour construire des liens (invitation
// avocat, partage DIP/contrat, confirmations d'email, callbacks OAuth...).
//
// Un déploiement preview Vercel (ex: app-dpi-git-main-xxx.vercel.app) est
// protégé par le SSO Vercel — tout lien pointant dessus renvoie l'utilisateur
// sur la page de connexion de Vercel, pas sur DIPpro, et rend le lien
// inutilisable. Si FRONTEND_URL/APP_URL est resté configuré sur une telle URL
// (à la main dans Vercel, ou par erreur), on l'ignore et on retombe sur le
// vrai domaine de production plutôt que de générer un lien cassé.
const PRODUCTION_URL = 'https://iralink-agency.dippro.business';

function isVercelPreviewUrl(url) {
  try {
    return /\.vercel\.app$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function getAppUrl() {
  const configured = process.env.FRONTEND_URL || process.env.APP_URL;
  if (configured && !isVercelPreviewUrl(configured)) return configured.replace(/\/$/, '');
  return PRODUCTION_URL;
}

module.exports = { getAppUrl, PRODUCTION_URL };
