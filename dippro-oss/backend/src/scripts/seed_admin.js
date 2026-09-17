/**
 * Script de seed: crée le compte admin beta
 * Usage: node src/scripts/seed_admin.js
 */
require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans l\'environnement — aucune valeur par défaut par sécurité.');
    process.exit(1);
  }

  console.log(`Création du compte admin: ${email}`);

  // Vérifier si l'utilisateur existe déjà
  const { data: existing } = await supabase
    .from('users').select('id').eq('email', email).single();

  if (existing) {
    console.log('Compte admin déjà existant.');
    return;
  }

  // Créer via Auth Admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    console.error('Erreur création auth:', authError.message);
    return;
  }

  // Créer le profil
  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    role: 'franchiseur',
    company_name: 'Iralink Agency',
    created_at: new Date().toISOString()
  });

  if (profileError) {
    console.error('Erreur création profil:', profileError.message);
    return;
  }

  console.log('✓ Compte admin créé avec succès');
  console.log(`  Email: ${email}`);
  console.log(`  UUID: ${authData.user.id}`);
}

seedAdmin().catch(console.error);
