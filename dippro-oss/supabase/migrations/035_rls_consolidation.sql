-- Migration 035 — Consolidation RLS (rapports de santé du 22 au 30/07/2026)
-- État réel vérifié en base (pg_policies) avant écriture — pas une simple
-- relecture des fichiers de migration.

-- ── 1. Policies dupliquées (même logique, deux policies actives) ──────────
-- Chaque doublon force Postgres à évaluer deux policies permissives pour la
-- même commande au lieu d'une seule — coût multiplié sans bénéfice, l'une
-- des deux vient toujours d'une création manuelle via le Dashboard Supabase
-- (jamais versionnée), l'autre de nos migrations.

DROP POLICY IF EXISTS "Users manage own contract clauses" ON public.contract_clauses;
-- garde "clauses_via_contract" (migration 031), déjà en (select auth.uid())

DROP POLICY IF EXISTS "cert_owner" ON public.dip_certificates;
-- garde "certificates_owner" (migration 031), déjà en (select auth.uid())

DROP POLICY IF EXISTS "Users manage own contracts" ON public.franchise_contracts;
-- garde "contracts_owner" (migration 031), déjà en (select auth.uid())

-- ── 2. avocat_writes_sections sur dip_sections — FAILLE DE SÉCURITÉ ────────
-- Cette policy (jamais versionnée, ajoutée à la main) autorise un avocat
-- ayant une relation active à écrire DIRECTEMENT dans dip_sections (cmd ALL)
-- via l'API REST Supabase avec son propre token — en contournant entièrement
-- le circuit prévu par l'application : proposition (dip_section_proposals)
-- puis validation explicite du franchiseur (PUT /avocat/proposals/:id/accept,
-- exécuté côté backend avec le service role). Aucun code frontend n'utilise
-- cette écriture directe — elle ne sert à rien de légitime et permet à un
-- avocat de modifier le DIP d'un franchiseur sans son accord.
DROP POLICY IF EXISTS "avocat_writes_sections" ON public.dip_sections;

-- ── 3. auth.uid() réévalué par ligne au lieu d'une fois par requête ────────
-- (select auth.uid()) est calculé une seule fois par Postgres ; la forme nue
-- est ré-exécutée pour chaque ligne évaluée — recommandation perf standard
-- Supabase, vérifiée table par table via pg_policies (pas une supposition).

DROP POLICY IF EXISTS "clause_proposal_access" ON public.contract_clause_proposals;
CREATE POLICY "clause_proposal_access" ON public.contract_clause_proposals
  FOR ALL USING (
    proposed_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.franchise_contracts fc
      WHERE fc.id = contract_clause_proposals.contract_id
        AND fc.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.franchise_contracts fc
      JOIN public.avocat_franchiseurs af ON af.franchiseur_id = fc.user_id
      WHERE fc.id = contract_clause_proposals.contract_id
        AND af.avocat_id = (select auth.uid())
        AND af.status = 'active'
    )
  );

DROP POLICY IF EXISTS "proposal_access" ON public.dip_section_proposals;
CREATE POLICY "proposal_access" ON public.dip_section_proposals
  FOR ALL USING (
    proposed_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.dip_documents dd
      WHERE dd.id = dip_section_proposals.dip_id
        AND dd.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.dip_documents dd
      JOIN public.avocat_franchiseurs af ON af.franchiseur_id = dd.user_id
      WHERE dd.id = dip_section_proposals.dip_id
        AND af.avocat_id = (select auth.uid())
        AND af.status = 'active'
    )
  );

DROP POLICY IF EXISTS "avocat_reads_followed_dips" ON public.dip_documents;
CREATE POLICY "avocat_reads_followed_dips" ON public.dip_documents
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.avocat_franchiseurs af
      WHERE af.avocat_id = (select auth.uid())
        AND af.franchiseur_id = dip_documents.user_id
        AND af.status = 'active'
    )
  );

DROP POLICY IF EXISTS "avocat_reads_followed_sections" ON public.dip_sections;
CREATE POLICY "avocat_reads_followed_sections" ON public.dip_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dip_documents d
      WHERE d.id = dip_sections.dip_id
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
  );
