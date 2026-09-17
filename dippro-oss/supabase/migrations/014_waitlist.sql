CREATE TABLE IF NOT EXISTS waitlist (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  phone        TEXT,
  message      TEXT,
  source       TEXT DEFAULT 'standalone',
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'dismissed')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Insertion publique (pas d'auth requise)
CREATE POLICY "waitlist_public_insert"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- Lecture réservée aux admins via service role uniquement (pas de policy SELECT)
-- Le backend utilise supabaseAdmin (service role) qui bypass RLS
