-- Migration 031 — Rattrapage colonnes/tables manquantes trouvées lors d'un
-- audit complet du SaaS. Plusieurs colonnes/tables référencées par le code
-- backend n'ont jamais été versionnées (ajoutées à la main via le Dashboard
-- Supabase, ou jamais créées du tout) — même symptôme déjà rencontré pour
-- avocat_franchiseurs/dip_section_proposals. Tout est IF NOT EXISTS : sûr à
-- exécuter même si certains éléments existent déjà.

-- ── users : colonnes manquantes ─────────────────────────────────────────────
-- lawyer_email est CRITIQUE : backend/src/routes/avocat.js fait un .update()
-- direct dessus sans fallback — l'invitation avocat par email plante en 500
-- tant que cette colonne n'existe pas.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS lawyer_email       TEXT,
  ADD COLUMN IF NOT EXISTS brevo_api_key      TEXT,
  ADD COLUMN IF NOT EXISTS brevo_sender_name  TEXT,
  ADD COLUMN IF NOT EXISTS brevo_sender_email TEXT;

-- ── alerts : colonnes manquantes (tunnel d'impact croisé DIP <-> Contrat) ──
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS clause_id UUID REFERENCES public.contract_clauses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cross_impact_from TEXT CHECK (cross_impact_from IN ('dip', 'contract'));

-- ── audit_log : colonnes manquantes (traçabilité côté contrat) ─────────────
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.franchise_contracts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS clause_id   UUID REFERENCES public.contract_clauses(id) ON DELETE SET NULL;

-- ── franchise_contracts : table jamais versionnée (déjà en prod, documentée
-- ici pour la reproductibilité) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.franchise_contracts (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  linked_dip_id          UUID REFERENCES public.dip_documents(id) ON DELETE SET NULL,
  title                  TEXT NOT NULL,
  file_url               TEXT,
  status                 TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'archive', 'brouillon')),
  conformity_score       INTEGER DEFAULT 0,
  raw_text               TEXT,
  sha256                 TEXT,
  compliance_level       TEXT,
  blocking_issues        JSONB DEFAULT '[]',
  share_token            TEXT UNIQUE,
  share_token_views      INTEGER DEFAULT 0,
  share_token_created_at TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.franchise_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contracts_owner" ON public.franchise_contracts;
CREATE POLICY "contracts_owner" ON public.franchise_contracts
  FOR ALL USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_franchise_contracts_user_id ON public.franchise_contracts(user_id);

-- ── contract_clauses : table jamais versionnée ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.contract_clauses (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id               UUID NOT NULL REFERENCES public.franchise_contracts(id) ON DELETE CASCADE,
  linked_dip_section_id     UUID REFERENCES public.dip_sections(id) ON DELETE SET NULL,
  clause_number             INTEGER,
  clause_title              TEXT,
  content                   TEXT,
  status                    TEXT NOT NULL DEFAULT 'a_verifier' CHECK (status IN ('conforme', 'a_verifier', 'non_conforme')),
  legal_blocking            BOOLEAN DEFAULT FALSE,
  mandatory_elements_found  JSONB DEFAULT '[]',
  mandatory_elements_missing JSONB DEFAULT '[]',
  last_checked              TIMESTAMPTZ,
  last_updated              TIMESTAMPTZ DEFAULT NOW(),
  last_edited_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_edited_at            TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clauses_via_contract" ON public.contract_clauses;
CREATE POLICY "clauses_via_contract" ON public.contract_clauses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.franchise_contracts fc
      WHERE fc.id = contract_clauses.contract_id AND fc.user_id = (select auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_contract_clauses_contract_id ON public.contract_clauses(contract_id);

-- ── dip_certificates : table jamais versionnée ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.dip_certificates (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dip_id             UUID NOT NULL REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  certificate_type   TEXT NOT NULL CHECK (certificate_type IN ('INITIAL', 'MISE_A_JOUR', 'REMISE')),
  certificate_title  TEXT,
  certificate_text   TEXT,
  legal_summary      TEXT,
  warnings           JSONB DEFAULT '[]',
  sha256_dip         TEXT,
  compliance_level   TEXT,
  global_score       INTEGER,
  changes_count      INTEGER DEFAULT 0,
  changes_snapshot   JSONB DEFAULT '[]',
  deliveries         JSONB DEFAULT '[]',
  generated_at       TIMESTAMPTZ DEFAULT NOW(),
  public_token       TEXT UNIQUE,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'ready', 'error')),
  pdf_url            TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dip_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "certificates_owner" ON public.dip_certificates;
CREATE POLICY "certificates_owner" ON public.dip_certificates
  FOR ALL USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_dip_certificates_user_id ON public.dip_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_dip_certificates_public_token ON public.dip_certificates(public_token) WHERE public_token IS NOT NULL;
