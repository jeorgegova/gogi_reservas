-- =========================================
-- 🚀 MIGRACIÓN: USUARIO INVITADO (GUEST MODE)
-- =========================================

-- 1. Agregar columnas faltantes a organizations si no existen
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS requires_auth boolean DEFAULT true;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS guest_user_id uuid;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS auto_approve_payments boolean DEFAULT false;

-- FK para guest_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'organizations_guest_user_id_fkey'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_guest_user_id_fkey
      FOREIGN KEY (guest_user_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- 2. Habilitar pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- 3. Crear función RPC para configurar usuario invitado
CREATE OR REPLACE FUNCTION public.setup_guest_user(org_id uuid, org_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  guest_uuid uuid;
  guest_email text;
BEGIN
  guest_email := org_slug || '-guest@system.gogireservas.com';

  -- 1. Verificar si ya existe en profiles por email
  SELECT id INTO guest_uuid
  FROM public.profiles
  WHERE email = guest_email
  LIMIT 1;

  IF guest_uuid IS NOT NULL THEN
    -- Asegurar que el perfil tenga la org y nombre correctos
    UPDATE public.profiles
    SET organization_id = org_id, full_name = 'Invitado', role = 'guest'
    WHERE id = guest_uuid
      AND (organization_id IS NULL OR organization_id != org_id);

    -- Asegurar que la organización lo tenga seteado
    UPDATE public.organizations
    SET guest_user_id = guest_uuid
    WHERE id = org_id AND (guest_user_id IS NULL OR guest_user_id != guest_uuid);

    RETURN guest_uuid;
  END IF;

  -- 2. Crear usuario en auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    guest_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO guest_uuid;

  -- 3. Insert en profiles con todos los datos correctos
  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (
    guest_uuid,
    guest_email,
    'Invitado',
    'guest',
    org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = 'Invitado',
    role = 'guest',
    organization_id = org_id;

  -- 4. Actualizar organización
  UPDATE public.organizations
  SET guest_user_id = guest_uuid
  WHERE id = org_id;

  RETURN guest_uuid;
END;
$$;

-- 4. Agregar columnas de descanso/almuerzo a operation_schedules
ALTER TABLE public.operation_schedules ADD COLUMN IF NOT EXISTS break_start text;
ALTER TABLE public.operation_schedules ADD COLUMN IF NOT EXISTS break_end text;

-- 5. Permitir que admins actualicen su propia organización
DROP POLICY IF EXISTS "Admins can update own org" ON public.organizations;
CREATE POLICY "Admins can update own org"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  is_admin_in_org(id)
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  is_admin_in_org(id)
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);
