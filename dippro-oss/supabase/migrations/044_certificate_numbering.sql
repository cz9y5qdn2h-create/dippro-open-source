-- Migration 044 — Numérotation séquentielle des attestations
--
-- Valeur probatoire : une attestation isolée prouve un état à une date. Une
-- SÉRIE numérotée sans trou prouve en plus qu'aucune modification n'a été
-- dissimulée — un numéro manquant serait immédiatement visible. C'est la
-- différence entre « voici une attestation » et « voici l'intégralité de mes
-- attestations, du n°1 au n°N », ce second point étant beaucoup plus
-- difficile à contester devant un juge.
--
-- La numérotation est par franchiseur (chacun a sa propre série n°1, 2, 3…)
-- et attribuée par un trigger atomique : deux modifications simultanées ne
-- peuvent pas recevoir le même numéro ni créer de trou.

ALTER TABLE public.dip_certificates
  ADD COLUMN IF NOT EXISTS certificate_number INTEGER;

-- Compteur par franchiseur — l'UPSERT atomique ci-dessous garantit
-- l'unicité même sous insertions concurrentes (contrairement à un
-- MAX(numero)+1 qui peut attribuer deux fois le même numéro).
CREATE TABLE IF NOT EXISTS public.certificate_counters (
  user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.certificate_counters ENABLE ROW LEVEL SECURITY;
-- Table technique : alimentée uniquement par le trigger (SECURITY DEFINER),
-- jamais lue ni écrite par le client.
DROP POLICY IF EXISTS "certificate_counters_deny_client" ON public.certificate_counters;
CREATE POLICY "certificate_counters_deny_client" ON public.certificate_counters
  FOR ALL USING (false) WITH CHECK (false);

-- Backfill : numéroter les attestations déjà émises dans leur ordre
-- chronologique réel, pour que la série soit continue depuis l'origine.
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY generated_at, created_at, id) AS n
  FROM public.dip_certificates
  WHERE certificate_number IS NULL
)
UPDATE public.dip_certificates c
SET certificate_number = numbered.n
FROM numbered
WHERE c.id = numbered.id;

-- Aligner le compteur sur l'existant, sinon la prochaine attestation
-- reprendrait à 1 et entrerait en collision.
INSERT INTO public.certificate_counters (user_id, last_number)
SELECT user_id, MAX(certificate_number)
FROM public.dip_certificates
WHERE certificate_number IS NOT NULL
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE
SET last_number = GREATEST(certificate_counters.last_number, EXCLUDED.last_number);

CREATE OR REPLACE FUNCTION public.assign_certificate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    INSERT INTO public.certificate_counters (user_id, last_number)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET last_number = certificate_counters.last_number + 1
    RETURNING last_number INTO NEW.certificate_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_certificate_number ON public.dip_certificates;
CREATE TRIGGER trg_assign_certificate_number
  BEFORE INSERT ON public.dip_certificates
  FOR EACH ROW EXECUTE FUNCTION public.assign_certificate_number();

-- Deux attestations d'un même franchiseur ne peuvent jamais porter le même
-- numéro — l'insertion échoue plutôt que de produire une série ambiguë.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dip_certificates_user_number
  ON public.dip_certificates(user_id, certificate_number);
