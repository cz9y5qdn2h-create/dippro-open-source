-- Migration 029 — Bucket Storage pour la bibliothèque de documents sources
-- Privé (contrairement à dip-files) : Kbis, comptes annuels, etc. sont des
-- pièces confidentielles, jamais destinées à être exposées publiquement.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'franchisor-documents',
  'franchisor-documents',
  false,
  26214400, -- 25 MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400;

-- Upload : uniquement dans son propre dossier (préfixe = user id)
DROP POLICY IF EXISTS "Users can upload their own franchisor documents" ON storage.objects;
CREATE POLICY "Users can upload their own franchisor documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'franchisor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Lecture : uniquement son propre dossier (pas de lecture publique)
DROP POLICY IF EXISTS "Users can read their own franchisor documents" ON storage.objects;
CREATE POLICY "Users can read their own franchisor documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'franchisor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Suppression : uniquement son propre dossier
DROP POLICY IF EXISTS "Users can delete their own franchisor documents" ON storage.objects;
CREATE POLICY "Users can delete their own franchisor documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'franchisor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
