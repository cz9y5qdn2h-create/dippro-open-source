-- Migration 053 — Relance email seul (formulaire waitlist abandonné)
-- ============================================================
-- Capture l'email dès qu'il est saisi dans le formulaire waitlist (landing
-- page ou /waitlist), même si le visiteur n'est jamais allé jusqu'au bout.
-- Table séparée de `waitlist` : `company_name` y est obligatoire, ce qui
-- rend `waitlist` impropre à stocker une capture email-seul.

CREATE TABLE IF NOT EXISTS public.waitlist_partial_emails (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT NOT NULL UNIQUE,
  source       TEXT NOT NULL DEFAULT 'waitlist_form',
  notified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_partial_emails_created_at ON public.waitlist_partial_emails(created_at DESC);

ALTER TABLE public.waitlist_partial_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_partial_emails_service_only" ON public.waitlist_partial_emails;
CREATE POLICY "waitlist_partial_emails_service_only" ON public.waitlist_partial_emails
  FOR ALL USING (false) WITH CHECK (false);
