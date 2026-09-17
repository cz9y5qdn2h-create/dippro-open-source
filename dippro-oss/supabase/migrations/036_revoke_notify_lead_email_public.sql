-- Migration 036 — La révocation d'exécution publique sur notify_lead_email()
-- (migrations 020/024/034) n'avait pas tenu : le rapport de santé du
-- 30/07/2026 montrait encore anon/authenticated comme exécutants autorisés.
-- Cause probable : la fonction a été recréée (CREATE OR REPLACE) après ces
-- migrations sans REVOKE derrière — PostgreSQL redonne l'exécution à PUBLIC
-- par défaut à chaque (re)création de fonction. On révoque aussi PUBLIC
-- explicitement cette fois (pas seulement anon/authenticated) pour que
-- personne d'autre ne récupère l'accès implicitement.
REVOKE EXECUTE ON FUNCTION public.notify_lead_email() FROM anon, authenticated, public;
