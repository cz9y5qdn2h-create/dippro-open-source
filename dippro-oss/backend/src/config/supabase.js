require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// On NE throw PAS au chargement : un throw ici tuerait toute la fonction
// serverless Vercel (FUNCTION_INVOCATION_FAILED) sur chaque route, sans
// message exploitable. On log clairement et on laisse /api/health révéler
// précisément quelle variable manque.
const missing = [];
if (!supabaseUrl) missing.push('SUPABASE_URL');
if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

const configOk = missing.length === 0;
if (!configOk) {
  console.error('[CONFIG] Variables Supabase manquantes: ' + missing.join(', ') +
    ' — ajoutez-les dans les variables d\'environnement Vercel.');
}

// Client admin (contourne RLS) — usage backend uniquement, jamais exposé au client.
// Fallback sur des placeholders si config absente : le client se construit sans
// exception, et les requêtes échouent proprement (erreur JSON capturée par les
// handlers) au lieu de faire crasher toute l'API.
const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-service-role-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabaseAdmin, configOk, missingConfig: missing };
