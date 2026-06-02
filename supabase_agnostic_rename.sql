-- ==============================================================================
-- MIGRACIÓN: ESQUEMA AGNÓSTICO POR INDUSTRIA
-- ==============================================================================
-- Convierte los nombres residenciales a nombres genéricos para que el sistema
-- funcione correctamente con Barberías, Salones, Talleres, Oficinas, etc.
--
-- Ejecutar en Supabase: Dashboard → SQL Editor → New Query → Pegar y Run.
-- IMPORTANTE: Hacer backup antes de ejecutar.
-- ==============================================================================


-- =======================================================
-- PASO 1: RENOMBRAR TABLAS
-- =======================================================

-- "Áreas Comunes" pasa a ser "Recursos" (empleados, canchas, puestos, etc.)
ALTER TABLE IF EXISTS public.common_areas RENAME TO resources;

-- "Servicios Adicionales" pasa a ser "Servicios" (catálogo de servicios)
ALTER TABLE IF EXISTS public.service_addons RENAME TO services;

-- Tabla junction recurso <-> servicio
ALTER TABLE IF EXISTS public.common_area_addons RENAME TO resource_services;

-- Tabla junction reserva <-> servicio seleccionado
ALTER TABLE IF EXISTS public.reservation_addons RENAME TO reservation_services;


-- =======================================================
-- PASO 2: RENOMBRAR COLUMNAS
-- =======================================================

-- En reservaciones
ALTER TABLE IF EXISTS public.reservations
  RENAME COLUMN common_area_id TO resource_id;

-- En avisos de mantenimiento
ALTER TABLE IF EXISTS public.maintenance_notices
  RENAME COLUMN common_area_id TO resource_id;

-- En resource_services (junction recursos <-> servicios)
ALTER TABLE IF EXISTS public.resource_services
  RENAME COLUMN common_area_id TO resource_id;

ALTER TABLE IF EXISTS public.resource_services
  RENAME COLUMN addon_id TO service_id;

-- En services (catálogo de servicios ligados a un recurso)
ALTER TABLE IF EXISTS public.services
  RENAME COLUMN common_area_id TO resource_id;

-- En reservation_services (servicios seleccionados por reserva)
ALTER TABLE IF EXISTS public.reservation_services
  RENAME COLUMN addon_id TO service_id;

-- En configuración de bonificaciones
ALTER TABLE IF EXISTS public.bonus_configs
  RENAME COLUMN common_area_id TO resource_id;


-- =======================================================
-- PASO 3: ACTUALIZAR ÍNDICES (recomendado)
-- =======================================================

ALTER INDEX IF EXISTS idx_common_areas_organization_id
  RENAME TO idx_resources_organization_id;

ALTER INDEX IF EXISTS idx_common_areas_is_active
  RENAME TO idx_resources_is_active;

ALTER INDEX IF EXISTS idx_reservations_common_area_id
  RENAME TO idx_reservations_resource_id;

ALTER INDEX IF EXISTS idx_maintenance_common_area_id
  RENAME TO idx_maintenance_resource_id;


-- =======================================================
-- PASO 4: RENOMBRAR CONSTRAINTS PRINCIPALES
-- =======================================================

ALTER TABLE public.resources
  RENAME CONSTRAINT common_areas_pkey TO resources_pkey;

ALTER TABLE public.resources
  RENAME CONSTRAINT common_areas_organization_id_fkey TO resources_organization_id_fkey;

ALTER TABLE public.services
  RENAME CONSTRAINT service_addons_pkey TO services_pkey;

ALTER TABLE public.reservation_services
  RENAME CONSTRAINT reservation_addons_pkey TO reservation_services_pkey;

ALTER TABLE public.reservation_services
  RENAME CONSTRAINT reservation_addons_unique TO reservation_services_unique;


-- =======================================================
-- PASO 5: ACTUALIZAR POLÍTICAS RLS
-- =======================================================

-- Política pública para recursos (reemplaza la de "common areas")
DROP POLICY IF EXISTS "Public can view common areas" ON public.resources;
CREATE POLICY "Public can view resources"
  ON public.resources FOR SELECT TO anon
  USING (is_active = true);

-- Política de administrador para recursos
DROP POLICY IF EXISTS "Admins manage common areas" ON public.resources;
CREATE POLICY "Admins manage resources"
  ON public.resources FOR ALL TO authenticated
  USING (
    (is_admin() AND belongs_to_org(organization_id))
    OR is_super_admin()
  )
  WITH CHECK (
    (is_admin() AND belongs_to_org(organization_id))
    OR is_super_admin()
  );

-- Habilitar RLS en las nuevas tablas (por si no estaba habilitado)
ALTER TABLE public.resource_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Política para services
CREATE POLICY IF NOT EXISTS "Admins manage services"
  ON public.services FOR ALL TO authenticated
  USING (
    (is_admin() AND belongs_to_org(organization_id))
    OR is_super_admin()
  )
  WITH CHECK (
    (is_admin() AND belongs_to_org(organization_id))
    OR is_super_admin()
  );

CREATE POLICY IF NOT EXISTS "Authenticated users view active services"
  ON public.services FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Anon can view active services"
  ON public.services FOR SELECT TO anon
  USING (is_active = true);

-- Política para reservation_services
CREATE POLICY IF NOT EXISTS "Users manage own reservation services"
  ON public.reservation_services FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND r.user_id = auth.uid()
    )
    OR is_admin()
    OR is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND r.user_id = auth.uid()
    )
    OR is_admin()
    OR is_super_admin()
  );

-- Política para resource_services (visible a todos)
CREATE POLICY IF NOT EXISTS "Anyone can view resource services"
  ON public.resource_services FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Admins manage resource services"
  ON public.resource_services FOR ALL TO authenticated
  USING (is_admin() OR is_super_admin())
  WITH CHECK (is_admin() OR is_super_admin());


-- ==============================================================================
-- FIN DE MIGRACIÓN
-- Después de ejecutar: en Supabase, ir a Settings > API > Reload schema cache.
-- ==============================================================================
