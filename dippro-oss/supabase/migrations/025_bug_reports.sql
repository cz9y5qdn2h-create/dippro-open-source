-- ─────────────────────────────────────────────────────────────────────────────
-- 025 — Signalement de bugs clients
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bug_reports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT,
  user_company  TEXT,
  description   TEXT        NOT NULL,
  page_url      TEXT,
  user_agent    TEXT,
  error_stack   TEXT,
  severity      TEXT        NOT NULL DEFAULT 'normal'
                CHECK (severity IN ('bloquant', 'normal', 'cosmétique')),
  status        TEXT        NOT NULL DEFAULT 'ouvert'
                CHECK (status IN ('ouvert', 'en_cours', 'résolu', 'ignoré')),
  admin_note    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul le service role (backend) peut accéder.

CREATE INDEX IF NOT EXISTS idx_bug_reports_status     ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id    ON bug_reports(user_id);
