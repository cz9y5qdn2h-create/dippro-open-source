-- Migration 041 — Suite du rapport de santé Supabase (04/08/2026)

-- 1. Index dupliqué sur avocat_franchiseurs.franchiseur_id — la migration
--    015 avait déjà créé idx_avocat_franchiseurs_franchiseur ; la 040 en a
--    recréé un second sous un autre nom sans vérifier. On retire celui
--    ajouté en 040 et on garde l'original.
DROP INDEX IF EXISTS public.idx_avocat_franchiseurs_franchiseur_id;

-- 2. FK non indexées restantes signalées par l'advisor performance.
CREATE INDEX IF NOT EXISTS idx_avocat_franchiseurs_invited_by   ON public.avocat_franchiseurs(invited_by);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_last_edited_by  ON public.contract_clauses(last_edited_by);
CREATE INDEX IF NOT EXISTS idx_dip_section_proposals_dip_id     ON public.dip_section_proposals(dip_id);
CREATE INDEX IF NOT EXISTS idx_dip_section_proposals_section_id ON public.dip_section_proposals(section_id);

-- 3. bug_reports / password_reset_tokens sans policy RLS : comportement
--    volontaire (voir migrations 023/024/025/034) — ces tables ne sont
--    accédées que par le backend via le service role, qui contourne RLS.
--    RLS actif + zéro policy bloque tout accès direct anon/authenticated,
--    ce qui est exactement le comportement recherché. Aucune policy à
--    ajouter — laissé tel quel intentionnellement.
