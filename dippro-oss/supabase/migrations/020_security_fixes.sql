-- ── 1. Restreindre la policy RLS allow_anon_insert sur leads ─────────────
-- Actuellement WITH CHECK (true) → n'importe qui peut insérer n'importe quoi.
-- On exige un email valide et non vide.
DROP POLICY IF EXISTS "allow_anon_insert" ON leads;
CREATE POLICY "allow_anon_insert" ON leads
  FOR INSERT
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) > 3
    AND email LIKE '%@%.%'
  );

-- ── 2. Fonction notify_lead_email — révoquer l'accès public ───────────────
-- SECURITY DEFINER + exécutable par anon est risqué (escalade de privilèges).
-- On révoque l'EXECUTE pour les rôles non privilégiés.
REVOKE EXECUTE ON FUNCTION notify_lead_email() FROM anon;
REVOKE EXECUTE ON FUNCTION notify_lead_email() FROM authenticated;
-- La fonction reste appelable par postgres / service_role (triggers, crons).

-- ── 3. Optimiser la policy RLS user_integrations ─────────────────────────
-- Remplacer auth.uid() (évalué par ligne) par (select auth.uid()) (évalué une fois)
DROP POLICY IF EXISTS "integration_owner" ON user_integrations;
CREATE POLICY "integration_owner" ON user_integrations
  FOR ALL USING ((select auth.uid()) = user_id);

-- ── 4. Optimiser la policy RLS local_user_files ───────────────────────────
DROP POLICY IF EXISTS "local_files_owner" ON local_user_files;
CREATE POLICY "local_files_owner" ON local_user_files
  FOR ALL USING ((select auth.uid()) = user_id);

-- ── 5. Nettoyer les index inutilisés connus ───────────────────────────────
-- (les index ci-dessous ont 0 scans selon l'advisor ; à adapter si votre charge change)
DROP INDEX IF EXISTS idx_alerts_user_status;
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_audit_log_contract;
DROP INDEX IF EXISTS idx_dip_certificates_user;
