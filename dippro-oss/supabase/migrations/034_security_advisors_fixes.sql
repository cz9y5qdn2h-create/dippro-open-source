-- Migration 034 — Corrections suite au rapport de santé Supabase du 22/07/2026
-- (advisors sécurité). Regroupe les correctifs déjà rédigés dans la migration
-- 024 (probablement jamais exécutée, vu que le rapport signale encore ces
-- mêmes alertes) + un nouveau correctif sur handle_new_user. Tout est
-- idempotent : sûr à rejouer même si une partie a déjà été appliquée.

-- ── 1. notify_lead_email exécutable publiquement (SECURITY DEFINER) ────────
-- La fonction tourne avec les droits de son propriétaire si un rôle anon/
-- authenticated peut l'appeler en RPC — accès non intentionnel révoqué.
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

-- ── 2. handle_new_user : search_path non fixé (risque d'injection de schéma)
-- SECURITY DEFINER + search_path mutable = un rôle pourrait faire résoudre
-- des objets d'un autre schéma placé avant "public" dans son search_path.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;
END $$;

-- ── 3. pg_net dans le schéma public (bonne pratique Supabase) ──────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore si déjà dans extensions ou droits insuffisants (à gérer via le
  -- Dashboard Supabase si cette exception se déclenche).
  NULL;
END $$;

-- ── 4. Index manquants sur clés étrangères (performance advisor) ───────────
CREATE INDEX IF NOT EXISTS idx_alerts_section_id    ON public.alerts(section_id);
CREATE INDEX IF NOT EXISTS idx_alerts_clause_id     ON public.alerts(clause_id);
CREATE INDEX IF NOT EXISTS idx_dip_sections_dip_id  ON public.dip_sections(dip_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_franchisee_id ON public.notifications(franchisee_id);

-- ── 5. bug_reports / password_reset_tokens : RLS activé sans policy ────────
-- C'est volontaire (voir commentaires dans 023/024/025) : ces deux tables ne
-- sont accédées que par le backend via le service role, qui contourne RLS
-- nativement. RLS actif + zéro policy bloque tout accès direct anon/
-- authenticated, ce qui est le comportement voulu. Aucune policy à ajouter.

-- ── 6. Policies encore en auth.uid() nu (réévalué par ligne) ───────────────
-- (select auth.uid()) n'est évalué qu'une fois par requête au lieu d'une fois
-- par ligne — déjà appliqué en migration 022 sur 8 tables principales, mais
-- ces 4 policies ajoutées par des migrations ultérieures (018, 019, 015)
-- étaient passées à travers.
DROP POLICY IF EXISTS "integration_owner" ON public.user_integrations;
CREATE POLICY "integration_owner" ON public.user_integrations
  FOR ALL USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "local_files_owner" ON public.local_user_files;
CREATE POLICY "local_files_owner" ON public.local_user_files
  FOR ALL USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_documents_owner" ON storage.objects;
CREATE POLICY "user_documents_owner" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-documents'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avocat_sees_own" ON public.avocat_franchiseurs;
CREATE POLICY "avocat_sees_own" ON public.avocat_franchiseurs
  FOR ALL USING ((select auth.uid()) = avocat_id OR (select auth.uid()) = franchiseur_id);
