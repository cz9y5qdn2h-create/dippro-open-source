-- ÉTAPE 2 : RLS et politiques de sécurité
-- À exécuter APRÈS step1_tables.sql

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dip_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchisees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own" ON public.users;
CREATE POLICY "users_own" ON public.users FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "dip_owner" ON public.dip_documents;
CREATE POLICY "dip_owner" ON public.dip_documents FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sections_via_dip" ON public.dip_sections;
CREATE POLICY "sections_via_dip" ON public.dip_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "alerts_via_dip" ON public.alerts;
CREATE POLICY "alerts_via_dip" ON public.alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "audit_via_dip" ON public.audit_log;
CREATE POLICY "audit_via_dip" ON public.audit_log FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "franchisees_owner" ON public.franchisees;
CREATE POLICY "franchisees_owner" ON public.franchisees FOR ALL USING (auth.uid() = franchiseur_id);

DROP POLICY IF EXISTS "notifications_via_franchisee" ON public.notifications;
CREATE POLICY "notifications_via_franchisee" ON public.notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.franchisees f WHERE f.id = franchisee_id AND f.franchiseur_id = auth.uid())
);

DROP POLICY IF EXISTS "sources_owner" ON public.data_sources;
CREATE POLICY "sources_owner" ON public.data_sources FOR ALL USING (auth.uid() = user_id);
