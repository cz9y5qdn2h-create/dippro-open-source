-- Migration 022 — Corrections schéma et performance
-- 1. Rend dip_id nullable sur alerts (pour les alertes monitoring sans DIP)
-- 2. Ajoute colonnes manquantes (user_id, type, title, description, contract_id)
-- 3. Optimise RLS avec (select auth.uid()) sur toutes les tables principales

-- ── Alerts : colonnes manquantes pour le monitoring ────────────────────────
ALTER TABLE public.alerts
  ALTER COLUMN dip_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'dip_change',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS contract_id UUID,
  ADD COLUMN IF NOT EXISTS needs_info BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS questions JSONB,
  ADD COLUMN IF NOT EXISTS corrections_made TEXT,
  ADD COLUMN IF NOT EXISTS remaining_issues TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence TEXT;

-- Index user_id sur alerts (queries monitoring)
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- ── RLS optimisée : (select auth.uid()) évalué une fois par requête ────────
-- Users
DROP POLICY IF EXISTS "users_own" ON public.users;
CREATE POLICY "users_own" ON public.users
  FOR ALL USING ((select auth.uid()) = id);

-- DIP documents
DROP POLICY IF EXISTS "dip_owner" ON public.dip_documents;
CREATE POLICY "dip_owner" ON public.dip_documents
  FOR ALL USING ((select auth.uid()) = user_id);

-- DIP sections
DROP POLICY IF EXISTS "sections_via_dip" ON public.dip_sections;
CREATE POLICY "sections_via_dip" ON public.dip_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dip_documents d
      WHERE d.id = dip_id AND d.user_id = (select auth.uid())
    )
  );

-- Alerts — inclut alertes monitoring (user_id direct) et DIP/contrat
DROP POLICY IF EXISTS "alerts_via_dip" ON public.alerts;
CREATE POLICY "alerts_via_dip" ON public.alerts
  FOR ALL USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.dip_documents d
      WHERE d.id = dip_id AND d.user_id = (select auth.uid())
    )
  );

-- Audit log
DROP POLICY IF EXISTS "audit_via_dip" ON public.audit_log;
CREATE POLICY "audit_via_dip" ON public.audit_log
  FOR ALL USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.dip_documents d
      WHERE d.id = dip_id AND d.user_id = (select auth.uid())
    )
  );

-- Franchisees
DROP POLICY IF EXISTS "franchisees_owner" ON public.franchisees;
CREATE POLICY "franchisees_owner" ON public.franchisees
  FOR ALL USING ((select auth.uid()) = franchiseur_id);

-- Notifications
DROP POLICY IF EXISTS "notifications_via_franchisee" ON public.notifications;
CREATE POLICY "notifications_via_franchisee" ON public.notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.franchisees f
      WHERE f.id = franchisee_id AND f.franchiseur_id = (select auth.uid())
    )
  );

-- Data sources
DROP POLICY IF EXISTS "sources_owner" ON public.data_sources;
CREATE POLICY "sources_owner" ON public.data_sources
  FOR ALL USING ((select auth.uid()) = user_id);
