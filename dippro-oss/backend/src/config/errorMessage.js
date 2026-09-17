const errMsg = (err) => {
  if (!err) return 'Erreur inconnue';
  let raw = '';
  if (typeof err === 'string') raw = err;
  else if (typeof err.message === 'string' && err.message) raw = err.message;
  else if (typeof err.error === 'string') raw = err.error;
  else if (typeof err.error?.message === 'string') raw = err.error.message;
  else if (typeof err.detail === 'string') raw = err.detail;
  else raw = JSON.stringify(err).substring(0, 200);

  // Traduction des erreurs techniques courantes
  if (/invalid.*api.?key/i.test(raw)) {
    if (/anthropic|claude/i.test(raw)) {
      return 'Clé Anthropic invalide. Vérifiez ANTHROPIC_API_KEY dans Vercel.';
    }
    return 'Clé API invalide (probablement SUPABASE_SERVICE_ROLE_KEY ou ANTHROPIC_API_KEY mal configurée sur Vercel). Visitez /api/health pour diagnostiquer.';
  }
  if (/JWT/i.test(raw) && /expired|invalid/i.test(raw)) {
    return 'Session expirée. Reconnectez-vous.';
  }
  if (/bucket.*not.*found/i.test(raw)) {
    return 'Bucket Storage inaccessible. Le projet Supabase ne contient pas le bucket dip-files ou la SUPABASE_URL est incorrecte sur Vercel.';
  }
  if (/connect.*ECONNREFUSED|ENOTFOUND|fetch failed/i.test(raw)) {
    return 'Service externe inaccessible. Réseau ou variables d\'environnement à vérifier.';
  }

  return raw;
};
module.exports = errMsg;
