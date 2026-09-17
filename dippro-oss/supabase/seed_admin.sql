-- ============================================================
-- Seed: Créer le compte admin beta
-- À exécuter via Supabase Dashboard > SQL Editor
-- OU via: supabase db reset --db-url ...
-- ============================================================

-- NOTE: La création du compte auth se fait via l'API Admin ou le Dashboard Supabase.
-- Ce seed crée uniquement le profil users une fois l'auth créé.

-- Après avoir créé l'utilisateur via Dashboard Supabase Auth (email + mot de
-- passe fort de votre choix), copier l'UUID généré et remplacer les valeurs
-- ci-dessous:

-- INSERT INTO public.users (id, email, role, company_name)
-- VALUES (
--   '<USER_UUID>',
--   '<votre email>',
--   'franchiseur',
--   '<votre société>'
-- );

-- OU via la fonction Edge (voir backend/src/scripts/seed_admin.js)
