-- =========================================
-- 🚀 MIGRACIÓN: MEMBRESÍAS MULTI-ORGANIZACIÓN
-- =========================================

-- 1. Crear tabla de membresías
CREATE TABLE IF NOT EXISTS public.memberships (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role text DEFAULT 'user'::text,
    phone text,
    apartment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT memberships_pkey PRIMARY KEY (id),
    CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT memberships_user_org_unique UNIQUE (user_id, organization_id)
);

-- 2. Habilitar RLS en membresías
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 3. Migrar datos existentes de 'profiles' a 'memberships'
-- Solo si la columna organization_id existe aún en profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='organization_id') THEN
        INSERT INTO public.memberships (user_id, organization_id, role, phone, apartment, created_at, updated_at)
        SELECT p.id, p.organization_id, p.role, p.phone, p.apartment, p.created_at, p.updated_at
        FROM public.profiles p
        JOIN auth.users u ON p.id = u.id
        WHERE p.organization_id IS NOT NULL
        ON CONFLICT (user_id, organization_id) DO NOTHING;
    END IF;
END $$;

-- 4. Actualizar funciones auxiliares para usar la tabla de membresías
-- Usamos SECURITY DEFINER para evitar recursividad infinita en las políticas RLS
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id
  FROM public.memberships
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_admin_in_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role = 'admin'
  );
$$;

-- 5. Crear políticas para la tabla de membresías
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;
CREATE POLICY "Users can view their own memberships"
ON public.memberships FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view memberships in their org" ON public.memberships;
CREATE POLICY "Admins can view memberships in their org"
ON public.memberships FOR SELECT
TO authenticated
USING (
  is_admin_in_org(organization_id) OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- Nueva política: Permitir a los usuarios crear su propia membresía (auto-asociación)
DROP POLICY IF EXISTS "Users can create their own membership" ON public.memberships;
CREATE POLICY "Users can create their own membership"
ON public.memberships FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Nueva política: Permitir a los administradores actualizar membresías de su organización
DROP POLICY IF EXISTS "Admins can update memberships in their org" ON public.memberships;
CREATE POLICY "Admins can update memberships in their org"
ON public.memberships FOR UPDATE
TO authenticated
USING (is_admin_in_org(organization_id))
WITH CHECK (is_admin_in_org(organization_id));

-- Nueva política: Permitir a los administradores eliminar membresías de su organización
DROP POLICY IF EXISTS "Admins can delete memberships in their org" ON public.memberships;
CREATE POLICY "Admins can delete memberships in their org"
ON public.memberships FOR DELETE
TO authenticated
USING (is_admin_in_org(organization_id));

-- 6. (Opcional) Limpiar tabla profiles
-- No eliminaremos las columnas aún para evitar romper la app antes de actualizar el código.
-- ALTER TABLE public.profiles DROP COLUMN organization_id;
-- ALTER TABLE public.profiles DROP COLUMN role;
-- ALTER TABLE public.profiles DROP COLUMN phone;
-- ALTER TABLE public.profiles DROP COLUMN apartment;
