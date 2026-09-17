-- ÉTAPE 1 : Créer toutes les tables
-- Collez ce bloc dans Supabase SQL Editor et cliquez Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'franchiseur',
  company_name TEXT,
  phone TEXT,
  address TEXT,
  siret VARCHAR(14),
  siren VARCHAR(9),
  renewal_alert_date DATE,
  automation_level INTEGER DEFAULT 1,
  notifications_email BOOLEAN DEFAULT TRUE,
  notifications_inapp BOOLEAN DEFAULT TRUE,
  notifications_sms BOOLEAN DEFAULT FALSE,
  notification_frequency TEXT DEFAULT 'immediate',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dip_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'actif',
  conformity_score INTEGER DEFAULT 0,
  raw_text TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dip_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dip_id UUID NOT NULL REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL,
  section_title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'a_verifier',
  last_checked TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dip_id UUID NOT NULL REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.dip_sections(id) ON DELETE SET NULL,
  old_value TEXT,
  new_value TEXT,
  source TEXT,
  suggestion TEXT,
  urgency TEXT DEFAULT 'moyenne',
  status TEXT NOT NULL DEFAULT 'pending',
  ignore_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

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

CREATE TABLE IF NOT EXISTS public.franchisees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchiseur_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  territory TEXT,
  contract_start DATE,
  contract_end DATE,
  status TEXT DEFAULT 'actif',
  whatsapp_number TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchisee_id UUID REFERENCES public.franchisees(id) ON DELETE CASCADE,
  dip_id UUID REFERENCES public.dip_documents(id) ON DELETE CASCADE,
  sections_updated TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent'
);

CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dip_documents_user_id ON public.dip_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_dip_sections_dip_id ON public.dip_sections(dip_id);
CREATE INDEX IF NOT EXISTS idx_alerts_dip_id ON public.alerts(dip_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_dip_id ON public.audit_log(dip_id);
CREATE INDEX IF NOT EXISTS idx_franchisees_franchiseur_id ON public.franchisees(franchiseur_id);
CREATE INDEX IF NOT EXISTS idx_notifications_franchisee_id ON public.notifications(franchisee_id);
