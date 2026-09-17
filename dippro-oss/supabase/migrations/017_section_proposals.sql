-- Migration 017 — Propositions de sections + historique des modifications
-- Modèle : avocat propose → franchiseur valide avant publication

CREATE TABLE IF NOT EXISTS public.dip_section_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id   UUID NOT NULL REFERENCES public.dip_sections(id)   ON DELETE CASCADE,
  dip_id       UUID NOT NULL REFERENCES public.dip_documents(id)  ON DELETE CASCADE,
  proposed_by  UUID NOT NULL REFERENCES public.users(id)          ON DELETE CASCADE,
  content_proposed TEXT NOT NULL,
  content_before   TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewer_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  reviewer_comment TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Champs d'historique sur dip_sections
ALTER TABLE public.dip_sections
  ADD COLUMN IF NOT EXISTS last_edited_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_edited_at  TIMESTAMPTZ;

-- RLS : accessible à l'avocat auteur et au franchiseur propriétaire du DIP
ALTER TABLE public.dip_section_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_access" ON public.dip_section_proposals
  FOR ALL USING (
    proposed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.dip_documents dd
      WHERE dd.id = dip_section_proposals.dip_id
        AND dd.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.dip_documents dd
      JOIN public.avocat_franchiseurs af ON af.franchiseur_id = dd.user_id
      WHERE dd.id = dip_section_proposals.dip_id
        AND af.avocat_id = auth.uid()
        AND af.status = 'active'
    )
  );
