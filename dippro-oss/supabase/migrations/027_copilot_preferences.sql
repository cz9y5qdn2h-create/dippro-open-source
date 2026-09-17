-- Migration 027 — Préférences du Copilot IA (mémoire persistante)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS copilot_addressing_name TEXT,
  ADD COLUMN IF NOT EXISTS copilot_formality TEXT DEFAULT 'vous' CHECK (copilot_formality IN ('tu', 'vous')),
  ADD COLUMN IF NOT EXISTS copilot_memory_notes TEXT;
