-- Migration 038 — Accès simplifié pour les avocats
--
-- Jusqu'ici, le seul chemin d'accès pour un avocat était : recevoir un lien
-- d'invitation d'un franchiseur (avocat_invite_token, propre à CE
-- franchiseur), puis créer un compte / se connecter manuellement. L'admin
-- Iralink veut pouvoir créer directement un compte avocat depuis la console
-- admin et lui fournir un lien d'accès permanent, indépendant de tout
-- franchiseur — d'où un token distinct, propre au COMPTE avocat lui-même.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avocat_access_token UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_avocat_access_token ON public.users(avocat_access_token) WHERE avocat_access_token IS NOT NULL;
