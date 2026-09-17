-- Migration 045 — Contrôle de validation avocat sur les modifications franchiseur
-- ============================================================
-- Jusqu'ici, seul le sens "avocat propose → franchiseur valide" existait
-- (dip_section_proposals / contract_clause_proposals, migration 017/030).
-- Le modèle économique s'inverse : l'avocat est désormais le client payeur
-- et l'autorité de conformité. Quand le FRANCHISEUR modifie directement une
-- section de DIP ou une clause de contrat, son avocat doit pouvoir confirmer
-- que c'est bien conforme — configurable par relation avocat↔franchiseur :
--   'strict' : la modification reste non certifiée tant que l'avocat n'a pas validé
--   'alerte' : la modification s'applique tout de suite, l'avocat est juste notifié

ALTER TABLE public.avocat_franchiseurs
  ADD COLUMN IF NOT EXISTS validation_mode TEXT NOT NULL DEFAULT 'alerte'
    CHECK (validation_mode IN ('strict', 'alerte'));

ALTER TABLE public.dip_sections
  ADD COLUMN IF NOT EXISTS avocat_validation_status TEXT NOT NULL DEFAULT 'n/a'
    CHECK (avocat_validation_status IN ('n/a', 'pending', 'validated', 'flagged')),
  ADD COLUMN IF NOT EXISTS avocat_validated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avocat_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avocat_validation_comment TEXT;

ALTER TABLE public.contract_clauses
  ADD COLUMN IF NOT EXISTS avocat_validation_status TEXT NOT NULL DEFAULT 'n/a'
    CHECK (avocat_validation_status IN ('n/a', 'pending', 'validated', 'flagged')),
  ADD COLUMN IF NOT EXISTS avocat_validated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avocat_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avocat_validation_comment TEXT;

CREATE INDEX IF NOT EXISTS idx_dip_sections_avocat_validation
  ON public.dip_sections(avocat_validation_status) WHERE avocat_validation_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_contract_clauses_avocat_validation
  ON public.contract_clauses(avocat_validation_status) WHERE avocat_validation_status = 'pending';
