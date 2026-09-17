-- Migration 050 — RLS manquantes signalées par l'advisor Supabase
-- ============================================================
-- password_reset_tokens avait RLS *désactivé* (pas juste "sans policy") :
-- une table contenant des tokens de réinitialisation de mot de passe liés à
-- un compte est exactement le type de donnée qui ne doit jamais dépendre
-- uniquement de l'absence de GRANT à anon/authenticated pour rester privée.
-- On active RLS et on pose un deny-all explicite — le service role (utilisé
-- par tout le backend) contourne RLS de toute façon, donc rien ne change
-- côté application ; seul un accès direct anon/authenticated est désormais
-- bloqué au niveau base plutôt que par convention.

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "password_reset_tokens_service_only" ON public.password_reset_tokens;
CREATE POLICY "password_reset_tokens_service_only" ON public.password_reset_tokens
  FOR ALL USING (false) WITH CHECK (false);

-- bug_reports avait déjà RLS activé sans aucune policy — comportement par
-- défaut de Postgres déjà deny-all pour anon/authenticated, donc pas de
-- faille réelle (backend/src/routes/bugs.js n'utilise que le service role),
-- mais l'absence de policy explicite est ce que l'advisor Supabase signale
-- comme ambigu. Une policy deny-all documente l'intention et fait taire
-- l'avertissement sans changer le comportement.
DROP POLICY IF EXISTS "bug_reports_service_only" ON public.bug_reports;
CREATE POLICY "bug_reports_service_only" ON public.bug_reports
  FOR ALL USING (false) WITH CHECK (false);
