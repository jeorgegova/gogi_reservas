-- ==========================================================
-- Migración: Añadir service_id a bonus_configs
-- Permite que barberías y salones configuren bonos por servicio
-- en lugar de por recurso (barbero/área).
-- ==========================================================

BEGIN;

-- 1. Hacer resource_id nullable (actualmente es NOT NULL)
ALTER TABLE public.bonus_configs
  ALTER COLUMN resource_id DROP NOT NULL;

-- 2. Añadir columna service_id nullable con FK a services
ALTER TABLE public.bonus_configs
  ADD COLUMN IF NOT EXISTS service_id uuid
  REFERENCES public.services(id) ON DELETE CASCADE;

-- 3. Constraint: al menos uno de resource_id o service_id debe estar presente
--    (una config debe apuntar a algo)
ALTER TABLE public.bonus_configs
  ADD CONSTRAINT bonus_configs_resource_or_service_check
  CHECK (resource_id IS NOT NULL OR service_id IS NOT NULL);

-- 4. Unique constraint: un config por servicio por organización
--    (el de resource_id ya puede existir; si da error, ignorar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bonus_configs_org_service_unique'
  ) THEN
    ALTER TABLE public.bonus_configs
      ADD CONSTRAINT bonus_configs_org_service_unique
      UNIQUE (organization_id, service_id);
  END IF;
END $$;

COMMIT;
