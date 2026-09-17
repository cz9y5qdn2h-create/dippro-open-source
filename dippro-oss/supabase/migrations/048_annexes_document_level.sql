-- Migration 048 — Annexes au niveau du document, plus par section
-- ============================================================
-- Comme sur un vrai acte juridique : les annexes se rattachent au DIP ou au
-- contrat dans son ensemble et s'énumèrent dans l'ordre à la fin du document
-- — jamais éparpillées section par section. On retire cette possibilité et
-- on ajoute un ordre d'énonciation explicite.

ALTER TABLE public.dip_section_annexes
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Ordre d'énonciation initial = ordre d'ajout, par document/contrat.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY COALESCE(dip_id, contract_id) ORDER BY created_at, id
  ) AS rn
  FROM public.dip_section_annexes
)
UPDATE public.dip_section_annexes a
SET position = ranked.rn
FROM ranked
WHERE a.id = ranked.id;

-- Les annexes déjà rattachées uniquement à une section/clause (avant cette
-- migration, dip_id/contract_id étaient déjà systématiquement renseignés en
-- parallèle — cf. migration 037) restent valides : on retire simplement
-- l'obligation d'avoir aussi section_id/clause_id. Les noms de contraintes
-- CHECK anonymes générés par Postgres ne sont pas garantis d'un environnement
-- à l'autre — on les retrouve dynamiquement plutôt que de les deviner.
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.dip_section_annexes'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.dip_section_annexes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.dip_section_annexes
  ADD CONSTRAINT dip_section_annexes_dip_or_contract
    CHECK (dip_id IS NOT NULL OR contract_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_dip_section_annexes_dip_position
  ON public.dip_section_annexes(dip_id, position) WHERE dip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dip_section_annexes_contract_position
  ON public.dip_section_annexes(contract_id, position) WHERE contract_id IS NOT NULL;
