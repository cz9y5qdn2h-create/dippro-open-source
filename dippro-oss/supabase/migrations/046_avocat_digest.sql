-- Migration 046 — Analyse programmée avocat (compte-rendu automatique)
-- ============================================================
-- L'avocat peut configurer une analyse récurrente de tous ses clients :
-- fréquence, canal, avec un historique de compte-rendus consultable.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avocat_digest_frequency TEXT NOT NULL DEFAULT 'off'
    CHECK (avocat_digest_frequency IN ('off', 'weekly', 'daily')),
  ADD COLUMN IF NOT EXISTS avocat_digest_channel TEXT NOT NULL DEFAULT 'inapp'
    CHECK (avocat_digest_channel IN ('email', 'inapp', 'both')),
  ADD COLUMN IF NOT EXISTS avocat_digest_last_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.avocat_digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avocat_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  franchiseur_count INTEGER NOT NULL DEFAULT 0,
  average_score INTEGER,
  summary JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_avocat_digests_avocat ON public.avocat_digests(avocat_id, generated_at DESC);

ALTER TABLE public.avocat_digests ENABLE ROW LEVEL SECURITY;

-- Deny-all côté client : ces lignes ne sont écrites/lues que par le backend
-- (service role), jamais directement par le navigateur.
DROP POLICY IF EXISTS "avocat_digests_service_only" ON public.avocat_digests;
CREATE POLICY "avocat_digests_service_only" ON public.avocat_digests
  FOR ALL USING (false) WITH CHECK (false);
