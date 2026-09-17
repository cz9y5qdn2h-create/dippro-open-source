-- Système de reset password maison (remplace les liens magiques Supabase)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prt_token   ON password_reset_tokens(token);
CREATE INDEX idx_prt_email   ON password_reset_tokens(email);
CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);

-- Accessible uniquement via service role — pas de RLS nécessaire
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
