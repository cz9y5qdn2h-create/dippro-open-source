-- Migration 042 — Suivi du délai légal de 20 jours + veille réglementaire analysée
--
-- 1. franchisees : type de candidature (création vs reprise d'un point de
--    vente existant — la reprise implique des données supplémentaires sur
--    l'historique du fonds repris) + dates de remise du DIP et de signature
--    prévue, pour calculer le délai légal de l'art. L.330-3/R.330-2.
ALTER TABLE public.franchisees
  ADD COLUMN IF NOT EXISTS candidate_type TEXT DEFAULT 'creation' CHECK (candidate_type IN ('creation', 'reprise')),
  ADD COLUMN IF NOT EXISTS dip_delivered_at DATE,
  ADD COLUMN IF NOT EXISTS planned_signature_date DATE;

-- 2. alerts : lien optionnel vers le franchisé concerné (délai 20 jours) —
--    jusqu'ici une alerte ne pouvait référencer qu'un DIP/contrat/section/clause.
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS franchisee_id UUID REFERENCES public.franchisees(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_alerts_franchisee_id ON public.alerts(franchisee_id);

-- 3. Cache des actualités réglementaires analysées par l'IA — évite de
--    ré-analyser le même article à chaque exécution du cron, et alimente les
--    aperçus + niveaux d'impact affichés sur la page Surveillance.
CREATE TABLE IF NOT EXISTS public.regulatory_news_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  summary TEXT,
  impact_level TEXT DEFAULT 'none' CHECK (impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
  impact_reason TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_news_cache_published_at ON public.regulatory_news_cache(published_at DESC);

ALTER TABLE public.regulatory_news_cache ENABLE ROW LEVEL SECURITY;
-- Lecture ouverte à tout utilisateur authentifié — ce sont des actualités
-- publiques déjà agrégées depuis des flux RSS publics, aucune donnée privée.
DROP POLICY IF EXISTS "regulatory_news_read" ON public.regulatory_news_cache;
CREATE POLICY "regulatory_news_read" ON public.regulatory_news_cache
  FOR SELECT USING (true);
-- Écriture réservée au service role (cron backend) — jamais au client.
