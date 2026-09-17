-- Migration 037 — Annexes de section DIP / clause de contrat
-- Permet au franchiseur ET à son avocat (relation active) de joindre des
-- pièces (avis juridique, Kbis, justificatif...) directement sur une section
-- du DIP ou une clause de contrat, dans le cadre de la refonte de l'espace
-- avocat (présentation type diaporama avec glisser-déposer).

CREATE TABLE IF NOT EXISTS public.dip_section_annexes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id    UUID REFERENCES public.dip_sections(id) ON DELETE CASCADE,
  clause_id     UUID REFERENCES public.contract_clauses(id) ON DELETE CASCADE,
  dip_id        UUID REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  contract_id   UUID REFERENCES public.franchise_contracts(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_url      TEXT,
  size_bytes    BIGINT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (section_id IS NOT NULL OR clause_id IS NOT NULL),
  CHECK ((section_id IS NOT NULL) = (dip_id IS NOT NULL)),
  CHECK ((clause_id IS NOT NULL) = (contract_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_dip_section_annexes_section  ON public.dip_section_annexes(section_id);
CREATE INDEX IF NOT EXISTS idx_dip_section_annexes_clause   ON public.dip_section_annexes(clause_id);
CREATE INDEX IF NOT EXISTS idx_dip_section_annexes_dip      ON public.dip_section_annexes(dip_id);
CREATE INDEX IF NOT EXISTS idx_dip_section_annexes_contract ON public.dip_section_annexes(contract_id);

ALTER TABLE public.dip_section_annexes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "annexes_access" ON public.dip_section_annexes;
CREATE POLICY "annexes_access" ON public.dip_section_annexes
  FOR ALL USING (
    uploaded_by = (select auth.uid())
    OR (
      dip_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.dip_documents d
        WHERE d.id = dip_section_annexes.dip_id
          AND (
            d.user_id = (select auth.uid())
            OR EXISTS (
              SELECT 1 FROM public.avocat_franchiseurs af
              WHERE af.avocat_id = (select auth.uid())
                AND af.franchiseur_id = d.user_id
                AND af.status = 'active'
            )
          )
      )
    )
    OR (
      contract_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.franchise_contracts fc
        WHERE fc.id = dip_section_annexes.contract_id
          AND (
            fc.user_id = (select auth.uid())
            OR EXISTS (
              SELECT 1 FROM public.avocat_franchiseurs af
              WHERE af.avocat_id = (select auth.uid())
                AND af.franchiseur_id = fc.user_id
                AND af.status = 'active'
            )
          )
      )
    )
  );

-- ── Storage : bucket privé, un dossier par franchiseur (le "propriétaire"
-- du DIP/contrat, pas forcément l'auteur de l'upload) ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dip-annexes',
  'dip-annexes',
  false,
  26214400, -- 25 Mo, même limite que franchisor-documents
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400;

-- Chemin attendu : {franchiseur_id}/{dip_id ou contract_id}/{section_id ou clause_id}/{filename}
-- => le premier segment du chemin identifie toujours le franchiseur propriétaire,
-- même quand c'est l'avocat qui uploade, pour que la policy storage reste simple.
DROP POLICY IF EXISTS "dip_annexes_access" ON storage.objects;
CREATE POLICY "dip_annexes_access"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'dip-annexes'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.avocat_franchiseurs af
      WHERE af.avocat_id = (select auth.uid())
        AND af.franchiseur_id::text = (storage.foldername(name))[1]
        AND af.status = 'active'
    )
  )
)
WITH CHECK (
  bucket_id = 'dip-annexes'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.avocat_franchiseurs af
      WHERE af.avocat_id = (select auth.uid())
        AND af.franchiseur_id::text = (storage.foldername(name))[1]
        AND af.status = 'active'
    )
  )
);
