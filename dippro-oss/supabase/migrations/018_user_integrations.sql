-- Table des intégrations OAuth par utilisateur
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'google_drive', 'google_gmail', 'microsoft_onedrive'
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  email TEXT,
  scopes TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_owner" ON user_integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user ON user_integrations(user_id);
