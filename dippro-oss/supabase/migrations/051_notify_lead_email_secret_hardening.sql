-- Migration 051 — notify_lead_email() : secret hors du code, GRANT durci
-- ============================================================
-- Cette fonction n'a jamais existé dans une migration versionnée — créée et
-- recréée à la main dans le SQL editor Supabase (au moins 4 fois d'après les
-- tentatives de REVOKE des migrations 020/024/034/036, qui "tenaient" un
-- temps puis "revenaient"). Chaque `CREATE OR REPLACE FUNCTION` réinitialise
-- le GRANT EXECUTE par défaut à PUBLIC en Postgres — c'est la cause racine
-- des échecs répétés, pas un oubli de REVOKE. Cette migration devient la
-- seule source de vérité : toute modification future de cette fonction doit
-- passer par une nouvelle migration, plus jamais par le SQL editor.
--
-- Problème plus grave trouvé en lisant sa définition réelle : le secret du
-- webhook (`x-webhook-secret`) était écrit EN CLAIR dans le corps de la
-- fonction. `pg_get_functiondef()` sur `pg_proc` est lisible par défaut par
-- n'importe quel rôle authentifié sur la plupart des installations Postgres
-- (catalogue système, pas une table applicative protégée par RLS) — combiné
-- au fait que EXECUTE a été régulièrement (re)accordé à anon/authenticated,
-- ce secret a probablement été exposé. Déplacé vers Supabase Vault.
--
-- SECURITY DEFINER conservé délibérément : le trigger doit pouvoir appeler
-- net.http_post() même quand l'INSERT qui le déclenche vient d'un rôle
-- anon/authenticated sans accès direct au schéma `net` — le retirer
-- casserait l'envoi pour ces cas. search_path déjà correctement épinglé
-- ('public', 'net') — pas de faille d'injection de search_path ici.

-- 1. Secret en Vault, généré PAR LA BASE (personne ne le voit ni ne le
--    committe jamais en clair). Après cette migration, récupérez-le une
--    seule fois dans le SQL Editor Supabase :
--      select decrypted_secret from vault.decrypted_secrets
--      where name = 'notify_lead_email_webhook_secret';
--    ⚠️ Reportez cette valeur comme secret attendu côté Edge Function
--    `send-lead-email` (Supabase Dashboard → Edge Functions →
--    send-lead-email → Secrets, ou `supabase secrets set`) — SINON le
--    webhook répondra 401/403 après cette migration, silencieusement, et
--    les emails de lead cesseront de partir.
select vault.create_secret(
  encode(gen_random_bytes(32), 'base64'),
  'notify_lead_email_webhook_secret',
  'Secret partagé avec la Supabase Edge Function send-lead-email'
);

-- 2. Fonction recréée sans secret en clair.
CREATE OR REPLACE FUNCTION public.notify_lead_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'vault'
AS $function$
declare
  webhook_secret text;
begin
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'notify_lead_email_webhook_secret';

  perform net.http_post(
    -- ⚠️ Remplacez par l'URL de l'Edge Function `send-lead-email` de VOTRE
    -- propre projet Supabase (Dashboard → Edge Functions → send-lead-email).
    url := 'https://<votre-projet>.functions.supabase.co/send-lead-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'email', NEW.email,
      'reseau', NEW.reseau,
      'qualifie', NEW.qualifie,
      'score', NEW.score
    )
  );
  return NEW;
end;
$function$;

-- 3. REVOKE dans la MÊME migration que le CREATE OR REPLACE, pour que les
--    deux vivent et meurent ensemble — plus jamais l'un sans l'autre.
REVOKE EXECUTE ON FUNCTION public.notify_lead_email() FROM PUBLIC, anon, authenticated;
