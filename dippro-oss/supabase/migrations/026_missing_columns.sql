-- Migration 026 — Colonnes manquantes dans dip_documents et dip_sections
-- Ces colonnes ont été ajoutées dans le code mais manquaient dans les migrations

-- dip_documents : colonnes ajoutées progressivement via le Dashboard Supabase
ALTER TABLE public.dip_documents
  ADD COLUMN IF NOT EXISTS sha256 TEXT,
  ADD COLUMN IF NOT EXISTS compliance_level TEXT,
  ADD COLUMN IF NOT EXISTS blocking_issues JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS share_token_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_token_created_at TIMESTAMPTZ;

-- dip_sections : colonnes de conformité Loi Doubin
ALTER TABLE public.dip_sections
  ADD COLUMN IF NOT EXISTS legal_blocking BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mandatory_elements_found JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS mandatory_elements_missing JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS legal_reference TEXT;

-- Index pour le token de partage
CREATE INDEX IF NOT EXISTS idx_dip_documents_share_token ON public.dip_documents(share_token) WHERE share_token IS NOT NULL;
