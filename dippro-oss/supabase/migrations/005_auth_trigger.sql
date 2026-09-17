-- Migration 005: Trigger auto-création profil utilisateur + bucket storage
-- À exécuter dans Supabase Dashboard > SQL Editor

-- 1. Trigger qui crée automatiquement un profil dans public.users
--    à chaque nouvel inscription via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, company_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'franchiseur',
    COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill: créer les profils manquants pour les comptes déjà existants
INSERT INTO public.users (id, email, role, company_name, created_at)
SELECT
  au.id,
  au.email,
  'franchiseur',
  COALESCE(au.raw_user_meta_data->>'company_name', split_part(au.email, '@', 1)),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;
