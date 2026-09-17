-- Migration 055 — dip-files et contract-files passent en buckets privés
--
-- CRITIQUE : ces deux buckets contiennent les DIP et contrats de franchise
-- bruts (les documents les plus confidentiels du produit) et étaient
-- créés avec public=true (004_storage_bucket.sql pour dip-files ; création
-- code-only sans migration pour contract-files, avec le même défaut). Un
-- bucket "public" chez Supabase sert les fichiers via une URL publique
-- (/storage/v1/object/public/...) qui ignore toute policy RLS : quiconque
-- obtient un storage_path (fuite de lien, Referer, historique navigateur)
-- télécharge le DIP ou le contrat de n'importe quel franchiseur, sans
-- authentification. Aligné ici sur le pattern déjà utilisé pour
-- franchisor-documents (029_franchisor_documents_bucket.sql).
--
-- Le champ dip.file_url / contract.file_url n'est actuellement lu par
-- aucune page du frontend (vérifié) — ce changement n'a donc aucun impact
-- fonctionnel visible ; le backend (service role, contourne RLS) continue
-- de fonctionner à l'identique pour l'upload et l'analyse des documents.

-- ── dip-files : bascule en privé + retire la lecture publique ──────────────
UPDATE storage.buckets SET public = false WHERE id = 'dip-files';

DROP POLICY IF EXISTS "DIP files are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own DIP files" ON storage.objects;
CREATE POLICY "Users can read their own DIP files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'dip-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── contract-files : n'avait aucune migration dédiée (créé par le code,
--    public=true par défaut) — on l'aligne complètement sur dip-files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-files',
  'contract-files',
  false,
  26214400, -- 25 MB, cohérent avec contracts.js
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400;

DROP POLICY IF EXISTS "Users can upload their own contract files" ON storage.objects;
CREATE POLICY "Users can upload their own contract files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read their own contract files" ON storage.objects;
CREATE POLICY "Users can read their own contract files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own contract files" ON storage.objects;
CREATE POLICY "Users can delete their own contract files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-files' AND (storage.foldername(name))[1] = auth.uid()::text);
