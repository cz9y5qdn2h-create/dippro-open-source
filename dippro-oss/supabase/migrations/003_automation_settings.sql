-- Migration 003: Automation level & notification preferences (DIPpro MVP)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS automation_level      INTEGER NOT NULL DEFAULT 1 CHECK (automation_level IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS notifications_email   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notifications_inapp   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notifications_sms     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_frequency TEXT NOT NULL DEFAULT 'immediate'
    CHECK (notification_frequency IN ('immediate', 'daily', 'weekly'));

COMMENT ON COLUMN public.users.automation_level IS '1=Approve step-by-step, 2=Approve all at once, 3=Auto-apply after delay';
COMMENT ON COLUMN public.users.notification_frequency IS 'immediate | daily | weekly';
