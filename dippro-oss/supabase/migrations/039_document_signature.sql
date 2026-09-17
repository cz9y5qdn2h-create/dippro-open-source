-- Migration 039 — Signature du DIP et du contrat de franchise
-- Ajoute une case signature directement dans le document (pages Mon DIP /
-- Mon contrat), distincte de l'attestation de remise (certificates.js) :
-- ici on capture un tracé de signature (image PNG en data URL), le nom du
-- signataire et la date, comme un "case signature" dans un éditeur de
-- document classique.

ALTER TABLE public.dip_documents
  ADD COLUMN IF NOT EXISTS signature_image TEXT,
  ADD COLUMN IF NOT EXISTS signed_by       TEXT,
  ADD COLUMN IF NOT EXISTS signed_at       TIMESTAMPTZ;

ALTER TABLE public.franchise_contracts
  ADD COLUMN IF NOT EXISTS signature_image TEXT,
  ADD COLUMN IF NOT EXISTS signed_by       TEXT,
  ADD COLUMN IF NOT EXISTS signed_at       TIMESTAMPTZ;
