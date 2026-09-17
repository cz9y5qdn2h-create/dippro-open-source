-- Migration 002: Champs SIRET/SIREN et date alerte renouvellement DIP
-- Requis pour la conformite Loi Doubin (Art. L.330-3)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS siret              VARCHAR(14),
  ADD COLUMN IF NOT EXISTS siren              VARCHAR(9),
  ADD COLUMN IF NOT EXISTS renewal_alert_date DATE;

COMMENT ON COLUMN users.siret IS 'Numero SIRET du franchiseur (14 chiffres)';
COMMENT ON COLUMN users.siren IS 'Numero SIREN du franchiseur (9 chiffres)';
COMMENT ON COLUMN users.renewal_alert_date IS 'Date limite annuelle de mise a jour du DIP (Loi Doubin)';
