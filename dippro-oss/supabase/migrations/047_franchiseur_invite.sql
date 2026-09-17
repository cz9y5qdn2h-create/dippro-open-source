-- Migration 047 — L'avocat invite ses clients franchiseurs (sens inverse du pivot)
-- ============================================================
-- Jusqu'ici seul le franchiseur pouvait inviter son avocat (avocat_access_token,
-- migration 038). Le modèle économique s'inverse : l'avocat est le client payeur,
-- c'est donc lui qui doit pouvoir créer et inviter ses clients franchiseurs —
-- même mécanique d'accès permanent par lien, sans mot de passe.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS franchiseur_access_token UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_franchiseur_access_token
  ON public.users(franchiseur_access_token) WHERE franchiseur_access_token IS NOT NULL;
