-- Migration 040 — Suite du rapport de santé Supabase (03/08/2026)
--
-- 1. dip_documents et dip_sections avaient chacune une policy "FOR ALL"
--    (propriétaire) ET une policy "FOR SELECT" dédiée (propriétaire OU
--    avocat suivant le dossier) — les deux permissives et toutes deux
--    évaluées à chaque SELECT, l'avocat n'y ayant pourtant pas plus de
--    droits d'écriture avec ou sans la seconde policy. On sépare la policy
--    "FOR ALL" en policies d'écriture (INSERT/UPDATE/DELETE, propriétaire
--    uniquement) et on laisse la policy SELECT existante (déjà propriétaire
--    OU avocat) comme seule et unique policy couvrant la lecture.
DROP POLICY IF EXISTS "dip_owner" ON public.dip_documents;
CREATE POLICY "dip_owner_insert" ON public.dip_documents
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "dip_owner_update" ON public.dip_documents
  FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "dip_owner_delete" ON public.dip_documents
  FOR DELETE USING ((select auth.uid()) = user_id);
-- SELECT reste couvert uniquement par "avocat_reads_followed_dips" (migration 035).

DROP POLICY IF EXISTS "sections_via_dip" ON public.dip_sections;
CREATE POLICY "sections_owner_insert" ON public.dip_sections
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = (select auth.uid()))
  );
CREATE POLICY "sections_owner_update" ON public.dip_sections
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = (select auth.uid())));
CREATE POLICY "sections_owner_delete" ON public.dip_sections
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = (select auth.uid()))
  );
-- SELECT reste couvert uniquement par "avocat_reads_followed_sections" (migration 035).

-- 2. Index manquants sur les clés étrangères signalées par l'advisor perf —
--    accélèrent les jointures/DELETE en cascade, aucun risque, purement additif.
CREATE INDEX IF NOT EXISTS idx_avocat_franchiseurs_franchiseur_id      ON public.avocat_franchiseurs(franchiseur_id);
CREATE INDEX IF NOT EXISTS idx_contract_clause_proposals_clause_id    ON public.contract_clause_proposals(clause_id);
CREATE INDEX IF NOT EXISTS idx_contract_clause_proposals_proposed_by  ON public.contract_clause_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_contract_clause_proposals_reviewer_id  ON public.contract_clause_proposals(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_dip_section_annexes_uploaded_by        ON public.dip_section_annexes(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_dip_section_proposals_proposed_by      ON public.dip_section_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_dip_section_proposals_reviewer_id      ON public.dip_section_proposals(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_dip_sections_last_edited_by            ON public.dip_sections(last_edited_by);
CREATE INDEX IF NOT EXISTS idx_local_user_files_user_id               ON public.local_user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suggestions_user_id               ON public.user_suggestions(user_id);
