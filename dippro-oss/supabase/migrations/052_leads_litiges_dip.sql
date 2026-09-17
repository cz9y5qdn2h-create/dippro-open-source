-- Migration 052 — Leads "base des litiges DIP" (capture LinkedIn avocats)
-- ============================================================
-- Table dédiée, volontairement séparée de `users`/`waitlist` : un lead qui
-- télécharge une ressource n'est pas un client, et ne doit jamais être
-- confondu avec un compte actif (RGPD : finalité et durée de conservation
-- différentes — prospection B2B, 3 ans depuis le dernier contact, pas la
-- durée de l'abonnement).

CREATE TABLE IF NOT EXISTS public.leads_litiges_dip (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom                      TEXT NOT NULL,
  email                    TEXT NOT NULL,
  telephone                TEXT NOT NULL,
  structure                TEXT,
  source                   TEXT NOT NULL DEFAULT 'linkedin_post12_pivot_avocats',
  consentement_horodatage  TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_litiges_dip_created_at ON public.leads_litiges_dip(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_litiges_dip_email ON public.leads_litiges_dip(email);

ALTER TABLE public.leads_litiges_dip ENABLE ROW LEVEL SECURITY;

-- Deny-all côté client : accessible uniquement au backend (service role).
DROP POLICY IF EXISTS "leads_litiges_dip_service_only" ON public.leads_litiges_dip;
CREATE POLICY "leads_litiges_dip_service_only" ON public.leads_litiges_dip
  FOR ALL USING (false) WITH CHECK (false);
