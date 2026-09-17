-- ─────────────────────────────────────────────────────────────────────────────
-- 024 — Corrections de sécurité (audit 2026-07-04)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. CRITIQUE : activer RLS sur password_reset_tokens
--    La table était exposée publiquement (DISABLE RLS).
--    Avec RLS activé + aucune policy = accès API bloqué pour anon/authenticated.
--    Le service role (backend) bypasse RLS nativement → aucun impact fonctionnel.
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Aucune policy ajoutée volontairement : seul le service role peut accéder.

-- 2. Révoquer l'exécution de notify_lead_email() aux rôles publics
--    La fonction tourne en SECURITY DEFINER, ce qui donne les droits du owner
--    si appelée par anon/authenticated. On restreint à service_role uniquement.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'notify_lead_email'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.notify_lead_email() FROM anon, authenticated;
  END IF;
END $$;

-- 3. Déplacer pg_net hors du schéma public
--    Nécessite que le schéma extensions existe (créé par Supabase par défaut).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore si déjà dans extensions ou droits insuffisants (gérer via dashboard)
  NULL;
END $$;

-- 4. Index manquants sur clés étrangères (performance advisor)
CREATE INDEX IF NOT EXISTS idx_alerts_section_id    ON alerts(section_id);
CREATE INDEX IF NOT EXISTS idx_alerts_clause_id     ON alerts(clause_id);
CREATE INDEX IF NOT EXISTS idx_dip_sections_dip_id  ON dip_sections(dip_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_franchisee_id ON notifications(franchisee_id);
