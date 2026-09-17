-- Migration 016 — Champs d'onboarding différencié (franchiseur / avocat)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nb_franchisees       INTEGER,
  ADD COLUMN IF NOT EXISTS avocat_nb_networks   INTEGER,
  ADD COLUMN IF NOT EXISTS has_existing_dip     BOOLEAN;
