-- Migration 006: Numéro WhatsApp franchisés + rôle admin

-- Ajouter numéro WhatsApp aux franchisés
ALTER TABLE public.franchisees
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Permettre le rôle admin
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('franchiseur', 'franchisé', 'admin'));

-- Passer theo@iralink-agency.com en admin
UPDATE public.users SET role = 'admin'
WHERE email = 'theo@iralink-agency.com';
