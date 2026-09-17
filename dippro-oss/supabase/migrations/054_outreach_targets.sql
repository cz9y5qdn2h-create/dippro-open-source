-- Migration 054 — Prospection automatique par email (cabinets d'avocats)
-- ============================================================
-- Cibles de prospection B2B, importées manuellement pour l'instant (CSV /
-- liste) — v1 volontairement sans connecteur d'enrichissement automatique
-- côté backend (nécessiterait un abonnement API à un fournisseur de
-- données tiers, décision produit distincte). Le pipeline d'envoi/relance
-- est lui entièrement automatique une fois une cible importée.

CREATE TABLE IF NOT EXISTS public.outreach_targets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom                 TEXT,
  email               TEXT NOT NULL UNIQUE,
  cabinet             TEXT,
  source              TEXT NOT NULL DEFAULT 'import_manuel',
  status              TEXT NOT NULL DEFAULT 'a_contacter'
                        CHECK (status IN ('a_contacter', 'contacte', 'desinscrit', 'bounce', 'converti')),
  unsubscribe_token   UUID NOT NULL DEFAULT uuid_generate_v4(),
  contacted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_targets_status ON public.outreach_targets(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_targets_unsub_token ON public.outreach_targets(unsubscribe_token);

ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outreach_targets_service_only" ON public.outreach_targets;
CREATE POLICY "outreach_targets_service_only" ON public.outreach_targets
  FOR ALL USING (false) WITH CHECK (false);
