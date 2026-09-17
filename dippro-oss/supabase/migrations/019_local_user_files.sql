CREATE TABLE IF NOT EXISTS local_user_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status TEXT DEFAULT 'analyzing' CHECK (status IN ('analyzing', 'done', 'error')),
  impact_level TEXT DEFAULT 'none',
  impact_summary TEXT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE local_user_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "local_files_owner" ON local_user_files;
CREATE POLICY "local_files_owner" ON local_user_files
  FOR ALL USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-documents',
  'user-documents',
  true,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "user_documents_owner" ON storage.objects;
CREATE POLICY "user_documents_owner" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
