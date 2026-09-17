-- Migration 015 — Renouvellement paramétrable + préparation rôle avocat
-- ============================================================

-- Renouvellement : seuil configurable en jours (défaut 30 jours avant la date anniversaire)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS renewal_alert_days INTEGER NOT NULL DEFAULT 30
    CHECK (renewal_alert_days BETWEEN 1 AND 365);

-- Rôle avocat : étend le CHECK existant sur users.role
-- Supabase ne supporte pas ALTER CONSTRAINT directement — on recrée la contrainte
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('franchiseur', 'franchisé', 'avocat', 'admin'));

-- Table de relation avocat <-> franchiseurs suivis (many-to-many)
-- Un avocat peut suivre plusieurs franchiseurs, un franchiseur peut avoir plusieurs avocats.
CREATE TABLE IF NOT EXISTS public.avocat_franchiseurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avocat_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  franchiseur_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (avocat_id, franchiseur_id)
);

CREATE INDEX IF NOT EXISTS idx_avocat_franchiseurs_avocat ON public.avocat_franchiseurs(avocat_id);
CREATE INDEX IF NOT EXISTS idx_avocat_franchiseurs_franchiseur ON public.avocat_franchiseurs(franchiseur_id);

-- RLS sur la table de relation
ALTER TABLE public.avocat_franchiseurs ENABLE ROW LEVEL SECURITY;

-- L'avocat voit ses propres relations
DROP POLICY IF EXISTS "avocat_sees_own" ON public.avocat_franchiseurs;
CREATE POLICY "avocat_sees_own" ON public.avocat_franchiseurs
  FOR ALL USING (auth.uid() = avocat_id OR auth.uid() = franchiseur_id);

-- L'avocat peut lire les DIPs des franchiseurs qu'il suit (status = 'active')
DROP POLICY IF EXISTS "avocat_reads_followed_dips" ON public.dip_documents;
CREATE POLICY "avocat_reads_followed_dips" ON public.dip_documents
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.avocat_franchiseurs af
      WHERE af.avocat_id = auth.uid()
        AND af.franchiseur_id = dip_documents.user_id
        AND af.status = 'active'
    )
  );

-- L'avocat peut lire les sections des DIPs de ses franchiseurs
DROP POLICY IF EXISTS "avocat_reads_followed_sections" ON public.dip_sections;
CREATE POLICY "avocat_reads_followed_sections" ON public.dip_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dip_documents d
      WHERE d.id = dip_sections.dip_id
        AND (
          d.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.avocat_franchiseurs af
            WHERE af.avocat_id = auth.uid()
              AND af.franchiseur_id = d.user_id
              AND af.status = 'active'
          )
        )
    )
  );

-- L'avocat peut écrire sur les sections si une relation active existe
DROP POLICY IF EXISTS "avocat_writes_sections" ON public.dip_sections;
CREATE POLICY "avocat_writes_sections" ON public.dip_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dip_documents d
      WHERE d.id = dip_sections.dip_id
        AND (
          d.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.avocat_franchiseurs af
            WHERE af.avocat_id = auth.uid()
              AND af.franchiseur_id = d.user_id
              AND af.status = 'active'
          )
        )
    )
  );

-- Trigger : à la création d'un compte avec rôle avocat via handle_new_user(),
-- on préserve le rôle depuis les metadata si présent.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'franchiseur');
  -- Validation du rôle
  IF v_role NOT IN ('franchiseur', 'avocat', 'franchisé', 'admin') THEN
    v_role := 'franchiseur';
  END IF;

  INSERT INTO public.users (id, email, role, company_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
