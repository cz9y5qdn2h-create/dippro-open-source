-- Création du bucket Supabase Storage pour les fichiers DIP
-- À exécuter dans Supabase Dashboard > SQL Editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dip-files',
  'dip-files',
  true,
  52428800, -- 50 MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Politique : les utilisateurs authentifiés peuvent uploader dans leur dossier
CREATE POLICY "Users can upload their own DIP files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dip-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Politique : lecture publique (pour afficher les fichiers)
CREATE POLICY "DIP files are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dip-files');

-- Politique : les utilisateurs peuvent supprimer leurs fichiers
CREATE POLICY "Users can delete their own DIP files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dip-files' AND (storage.foldername(name))[1] = auth.uid()::text);
