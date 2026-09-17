const { supabaseAdmin } = require('./supabase');

// Colonnes dont le code dépend réellement, table par table. Une migration
// écrite dans le repo mais jamais appliquée en production fait échouer les
// écritures correspondantes *silencieusement* (le client Supabase renvoie
// une erreur que les appels en tâche de fond ignorent) : la 022 a ainsi
// cassé les alertes pendant 11 heures sans qu'aucun signal ne remonte.
// Ce contrôle transforme cette dérive invisible en diagnostic immédiat.
const REQUIRED_COLUMNS = {
  users:              ['id', 'email', 'role', 'avocat_access_token', 'franchiseur_access_token', 'lawyer_email', 'avocat_digest_frequency', 'avocat_digest_channel', 'avocat_digest_last_sent_at', 'resend_api_key', 'resend_sender_name', 'resend_sender_email'],
  alerts:             ['id', 'user_id', 'type', 'title', 'contract_id', 'clause_id', 'franchisee_id'],
  dip_documents:      ['id', 'user_id', 'status', 'sha256', 'compliance_level', 'signature_image'],
  dip_sections:       ['id', 'dip_id', 'content', 'legal_blocking', 'last_edited_by', 'avocat_validation_status'],
  franchise_contracts:['id', 'user_id', 'linked_dip_id', 'signature_image'],
  contract_clauses:   ['id', 'contract_id', 'content', 'last_edited_by', 'avocat_validation_status'],
  franchisees:        ['id', 'franchiseur_id', 'candidate_type', 'dip_delivered_at', 'planned_signature_date'],
  dip_certificates:   ['id', 'user_id', 'certificate_number', 'public_token', 'status'],
  avocat_franchiseurs:['id', 'avocat_id', 'franchiseur_id', 'status', 'validation_mode'],
  avocat_digests:     ['id', 'avocat_id', 'generated_at', 'average_score', 'summary'],
  dip_section_annexes:['id', 'dip_id', 'contract_id', 'position', 'storage_path'],
  regulatory_news_cache: ['id', 'impact_level', 'impact_reason'],
  leads_litiges_dip:  ['id', 'nom', 'email', 'telephone', 'source', 'consentement_horodatage'],
  waitlist_partial_emails: ['id', 'email', 'source', 'notified_at'],
  outreach_targets:   ['id', 'email', 'status', 'unsubscribe_token', 'contacted_at'],
};

// Une seule ligne suffit à valider la présence des colonnes : PostgREST
// rejette la requête si l'une d'elles n'existe pas, sans lire de données.
async function checkSchema() {
  const missing = [];

  await Promise.all(Object.entries(REQUIRED_COLUMNS).map(async ([table, columns]) => {
    const { error } = await supabaseAdmin.from(table).select(columns.join(',')).limit(1);
    if (!error) return;
    // 42703 = undefined_column, 42P01 = undefined_table
    if (error.code === '42703' || error.code === '42P01' || /does not exist/i.test(error.message || '')) {
      missing.push({ table, error: error.message });
    }
  }));

  return { ok: missing.length === 0, missing };
}

module.exports = { checkSchema, REQUIRED_COLUMNS };
