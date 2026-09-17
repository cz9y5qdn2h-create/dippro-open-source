-- Migration 049 — Migration Brevo → Resend
-- ============================================================
-- Remplace les colonnes de configuration email par franchiseur. Les
-- anciennes clés Brevo ne sont plus utilisées par le code (voir
-- backend/src/config/email.js) ; conservées telles quelles sans purge pour
-- ne rien perdre côté audit, mais aucune route ne les lit ni ne les écrit
-- plus.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
  ADD COLUMN IF NOT EXISTS resend_sender_name TEXT,
  ADD COLUMN IF NOT EXISTS resend_sender_email TEXT;
