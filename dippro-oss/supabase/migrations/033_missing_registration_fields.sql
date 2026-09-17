-- Migration 033 — colonnes manquantes trouvées en poursuivant l'audit après
-- l'erreur "avocat_invite_token" : backend/src/routes/auth.js écrit ces
-- champs à chaque inscription (POST /api/auth/register) et provisioning
-- OAuth (POST /api/auth/provision-oauth) sans qu'aucune migration ne les
-- ait jamais créés — même risque de plantage en 500 que lawyer_email.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_expires_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appointment_booked       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_accepted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version            TEXT,
  ADD COLUMN IF NOT EXISTS marketing_consent        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_disclaimer_accepted   BOOLEAN DEFAULT FALSE;
