-- Migration 028 — Bibliothèque de documents sources du franchiseur
-- Permet d'uploader les pièces justificatives (Kbis, comptes annuels, INPI...)
-- une fois, réutilisées à chaque génération/mise à jour du DIP, avec
-- extraction IA automatique et checklist de complétude.

CREATE TABLE IF NOT EXISTS public.franchisor_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type       TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  storage_path        TEXT NOT NULL,
  file_url            TEXT,
  extracted_summary   TEXT,
  extraction_status   TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'done', 'failed')),
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.franchisor_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "franchisor_documents_owner" ON public.franchisor_documents;
CREATE POLICY "franchisor_documents_owner" ON public.franchisor_documents
  FOR ALL USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_franchisor_documents_user_id ON public.franchisor_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_franchisor_documents_type ON public.franchisor_documents(user_id, document_type);
