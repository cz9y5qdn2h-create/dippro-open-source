-- Migration 043 — Documente l'intention derrière RLS activé sans policy
--
-- bug_reports et password_reset_tokens ne sont accédées QUE par le backend
-- via supabaseAdmin (service role, qui contourne RLS de toute façon) —
-- jamais par le client avec la clé anonyme. RLS activé sans aucune policy
-- bloque déjà tout accès anon/authenticated, ce qui est le comportement
-- voulu ; cette policy explicite "deny all" ne change rien fonctionnellement,
-- elle documente juste l'intention pour que l'advisor Supabase arrête de la
-- signaler comme un oubli.
DROP POLICY IF EXISTS "bug_reports_deny_client" ON public.bug_reports;
CREATE POLICY "bug_reports_deny_client" ON public.bug_reports
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "password_reset_tokens_deny_client" ON public.password_reset_tokens;
CREATE POLICY "password_reset_tokens_deny_client" ON public.password_reset_tokens
  FOR ALL USING (false) WITH CHECK (false);
