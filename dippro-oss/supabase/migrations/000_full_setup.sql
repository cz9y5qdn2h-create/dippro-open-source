-- ============================================================
-- DIPpro — Initialisation complète de la base de données
-- Toutes migrations combinées (001 → 006)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE: users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'franchiseur' CHECK (role IN ('franchiseur', 'franchisé', 'admin')),
  company_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: dip_documents
CREATE TABLE IF NOT EXISTS public.dip_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'archive', 'brouillon')),
  conformity_score INTEGER DEFAULT 0 CHECK (conformity_score >= 0 AND conformity_score <= 100),
  raw_text TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: dip_sections
CREATE TABLE IF NOT EXISTS public.dip_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dip_id UUID NOT NULL REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL CHECK (section_number BETWEEN 1 AND 10),
  section_title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'a_verifier' CHECK (status IN ('conforme', 'a_verifier', 'non_conforme')),
  last_checked TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dip_id UUID NOT NULL REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.dip_sections(id) ON DELETE SET NULL,
  old_value TEXT,
  new_value TEXT,
  source TEXT,
  suggestion TEXT,
  urgency TEXT DEFAULT 'moyenne' CHECK (urgency IN ('haute', 'moyenne', 'faible')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'ignored')),
  ignore_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- TABLE: audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dip_id UUID REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.dip_sections(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_content TEXT,
  new_content TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: franchisees
CREATE TABLE IF NOT EXISTS public.franchisees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchiseur_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  territory TEXT,
  contract_start DATE,
  contract_end DATE,
  status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'inactif', 'en_cours')),
  whatsapp_number TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchisee_id UUID REFERENCES public.franchisees(id) ON DELETE CASCADE,
  dip_id UUID REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  sections_updated TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

-- TABLE: data_sources
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'google_drive', 'manual', 'api')),
  config JSONB DEFAULT '{}',
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colonnes supplémentaires (migrations 002 + 003)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS siret VARCHAR(14),
  ADD COLUMN IF NOT EXISTS siren VARCHAR(9),
  ADD COLUMN IF NOT EXISTS renewal_alert_date DATE,
  ADD COLUMN IF NOT EXISTS automation_level INTEGER NOT NULL DEFAULT 1
    CHECK (automation_level IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notifications_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notifications_sms BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_frequency TEXT NOT NULL DEFAULT 'immediate'
    CHECK (notification_frequency IN ('immediate', 'daily', 'weekly'));

-- INDEX
CREATE INDEX IF NOT EXISTS idx_dip_documents_user_id ON public.dip_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_dip_sections_dip_id ON public.dip_sections(dip_id);
CREATE INDEX IF NOT EXISTS idx_alerts_dip_id ON public.alerts(dip_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_dip_id ON public.audit_log(dip_id);
CREATE INDEX IF NOT EXISTS idx_franchisees_franchiseur_id ON public.franchisees(franchiseur_id);
CREATE INDEX IF NOT EXISTS idx_notifications_franchisee_id ON public.notifications(franchisee_id);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dip_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchisees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "users_own" ON public.users;
CREATE POLICY "users_own" ON public.users FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "dip_owner" ON public.dip_documents;
CREATE POLICY "dip_owner" ON public.dip_documents FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sections_via_dip" ON public.dip_sections;
CREATE POLICY "sections_via_dip" ON public.dip_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "alerts_via_dip" ON public.alerts;
CREATE POLICY "alerts_via_dip" ON public.alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "audit_via_dip" ON public.audit_log;
CREATE POLICY "audit_via_dip" ON public.audit_log FOR ALL USING (
  EXISTS (SELECT 1 FROM public.dip_documents d WHERE d.id = dip_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "franchisees_owner" ON public.franchisees;
CREATE POLICY "franchisees_owner" ON public.franchisees FOR ALL USING (auth.uid() = franchiseur_id);

DROP POLICY IF EXISTS "notifications_via_franchisee" ON public.notifications;
CREATE POLICY "notifications_via_franchisee" ON public.notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.franchisees f WHERE f.id = franchisee_id AND f.franchiseur_id = auth.uid())
);

DROP POLICY IF EXISTS "sources_owner" ON public.data_sources;
CREATE POLICY "sources_owner" ON public.data_sources FOR ALL USING (auth.uid() = user_id);

-- Trigger auto-création profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, company_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'franchiseur',
    COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profils existants
INSERT INTO public.users (id, email, role, company_name, created_at)
SELECT
  au.id,
  au.email,
  'franchiseur',
  COALESCE(au.raw_user_meta_data->>'company_name', split_part(au.email, '@', 1)),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Passer theo@iralink-agency.com en admin
UPDATE public.users SET role = 'admin'
WHERE email = 'theo@iralink-agency.com';
