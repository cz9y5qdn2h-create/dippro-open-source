-- Migration 030 — Partage avocat par lien + propositions sur clauses de contrat
-- (jusqu'ici seules les sections DIP avaient un système de proposition)

-- Lien d'invitation avocat : un token générique par franchiseur, à partager
-- par le canal de son choix (email perso, SMS...). Contrairement à
-- l'invitation par email existante, aucune adresse n'a besoin d'être connue
-- à l'avance côté DIPpro.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avocat_invite_token UUID UNIQUE;

CREATE TABLE IF NOT EXISTS public.contract_clause_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clause_id     UUID NOT NULL REFERENCES public.contract_clauses(id)     ON DELETE CASCADE,
  contract_id   UUID NOT NULL REFERENCES public.franchise_contracts(id) ON DELETE CASCADE,
  proposed_by   UUID NOT NULL REFERENCES public.users(id)               ON DELETE CASCADE,
  content_proposed TEXT NOT NULL,
  content_before   TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewer_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  reviewer_comment TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contract_clauses
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

ALTER TABLE public.contract_clause_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clause_proposal_access" ON public.contract_clause_proposals;
CREATE POLICY "clause_proposal_access" ON public.contract_clause_proposals
  FOR ALL USING (
    proposed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.franchise_contracts fc
      WHERE fc.id = contract_clause_proposals.contract_id
        AND fc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.franchise_contracts fc
      JOIN public.avocat_franchiseurs af ON af.franchiseur_id = fc.user_id
      WHERE fc.id = contract_clause_proposals.contract_id
        AND af.avocat_id = auth.uid()
        AND af.status = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS idx_contract_clause_proposals_contract_id ON public.contract_clause_proposals(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_clause_proposals_clause_id ON public.contract_clause_proposals(clause_id);
