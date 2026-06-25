-- ==========================================================
-- MIGRACIÓN SEGURA – RE‑ESTRUCTURACIÓN DE SERVICIOS
-- ----------------------------------------------------------
-- Objetivo:
--   1️⃣ Renombrar tablas y columnas para usar el modelo:
--        resources (empleados)  ←  tabla ya existente
--        services               ←  antes common_areas
--        resource_services      ←  antes common_area_addons
--   2️⃣ Actualizar todas las FK, índices y políticas RLS.
--   3️⃣ No crear nuevas tablas de empleados.
-- ==========================================================

BEGIN;

--------------------------------------------------------------------------------
-- 1️⃣ RENOMBRAR TABLA DE SERVICIOS
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = 'common_areas'
    ) THEN
        ALTER TABLE public.common_areas RENAME TO services;
    END IF;
END $$;
-- Ajustar PK y FK de la tabla renombrada
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS common_areas_pkey;
ALTER TABLE public.services ADD CONSTRAINT services_pkey PRIMARY KEY (id);

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS common_areas_organization_id_fkey;
ALTER TABLE public.services
    ADD CONSTRAINT services_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

--------------------------------------------------------------------------------
-- 2️⃣ RENOMBRAR TABLA DE RELACIÓN DE SERVICIOS ADICIONALES
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = 'common_area_addons'
    ) THEN
        ALTER TABLE public.common_area_addons RENAME TO resource_services;
    END IF;
END $$;

-- Renombrar columnas dentro de resource_services
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='resource_services' 
          AND column_name='common_area_id'
    ) THEN
        ALTER TABLE public.resource_services RENAME COLUMN common_area_id TO resource_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='resource_services' 
          AND column_name='addon_id'
    ) THEN
        ALTER TABLE public.resource_services RENAME COLUMN addon_id TO service_id;
    END IF;
END $$;

-- Ajustar PK / UNIQUE y FK de la tabla renombrada
ALTER TABLE public.resource_services DROP CONSTRAINT IF EXISTS common_area_addons_pkey;
ALTER TABLE public.resource_services ADD CONSTRAINT resource_services_pkey PRIMARY KEY (id);

ALTER TABLE public.resource_services DROP CONSTRAINT IF EXISTS resource_services_unique;
ALTER TABLE public.resource_services ADD CONSTRAINT resource_services_unique UNIQUE (resource_id, service_id);

-- FK hacia services (antes common_areas)
ALTER TABLE public.resource_services DROP CONSTRAINT IF EXISTS common_area_addons_common_area_id_fkey;
ALTER TABLE public.resource_services
    ADD CONSTRAINT resource_services_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES public.services(id) ON DELETE CASCADE;

-- FK hacia service_addons (mantiene su nombre)
ALTER TABLE public.resource_services DROP CONSTRAINT IF EXISTS common_area_addons_addon_id_fkey;
ALTER TABLE public.resource_services
    ADD CONSTRAINT resource_services_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES public.service_addons(id) ON DELETE CASCADE;

--------------------------------------------------------------------------------
-- 3️⃣ ACTUALIZAR COLUMNA DE SERVICIO EN RESERVATIONS
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='reservations' 
          AND column_name='common_area_id'
    ) THEN
        ALTER TABLE public.reservations RENAME COLUMN common_area_id TO service_id;
    END IF;
END $$;

-- FK a services
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_common_area_id_fkey;
ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES public.services(id);

--------------------------------------------------------------------------------
-- 4️⃣ ACTUALIZAR COLUMNA EN MAINTENANCE_NOTICES
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='maintenance_notices' 
          AND column_name='common_area_id'
    ) THEN
        ALTER TABLE public.maintenance_notices RENAME COLUMN common_area_id TO service_id;
    END IF;
END $$;

ALTER TABLE public.maintenance_notices DROP CONSTRAINT IF EXISTS maintenance_notices_common_area_id_fkey;
ALTER TABLE public.maintenance_notices
    ADD CONSTRAINT maintenance_notices_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES public.services(id);

--------------------------------------------------------------------------------
-- 5️⃣ ACTUALIZAR TABLA DE ADICIONALES DE SERVICIOS (service_addons)
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='service_addons' 
          AND column_name='common_area_id'
    ) THEN
        ALTER TABLE public.service_addons RENAME COLUMN common_area_id TO service_id;
    END IF;
END $$;

ALTER TABLE public.service_addons DROP CONSTRAINT IF EXISTS service_addons_common_area_id_fkey;
ALTER TABLE public.service_addons
    ADD CONSTRAINT service_addons_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

--------------------------------------------------------------------------------
-- 6️⃣ RENOMBRAR Y AJUSTAR TABLA DE ADDONS EN RESERVAS
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname='public' 
          AND tablename='reservation_addons'
    ) THEN
        ALTER TABLE public.reservation_addons RENAME TO reservation_services;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='reservation_services' 
          AND column_name='addon_id'
    ) THEN
        ALTER TABLE public.reservation_services RENAME COLUMN addon_id TO service_id;
    END IF;
END $$;

-- PK / UNIQUE de reservation_services
ALTER TABLE public.reservation_services DROP CONSTRAINT IF EXISTS reservation_addons_pkey;
ALTER TABLE public.reservation_services ADD CONSTRAINT reservation_services_pkey PRIMARY KEY (id);

ALTER TABLE public.reservation_services DROP CONSTRAINT IF EXISTS reservation_addons_unique;
ALTER TABLE public.reservation_services ADD CONSTRAINT reservation_services_unique UNIQUE (reservation_id, service_id);

-- FK a reservations (ya exista)
ALTER TABLE public.reservation_services DROP CONSTRAINT IF EXISTS reservation_addons_reservation_id_fkey;
ALTER TABLE public.reservation_services
    ADD CONSTRAINT reservation_services_reservation_id_fkey
        FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;

-- FK a service_addons (ahora apunta a service_id en service_addons)
ALTER TABLE public.reservation_services DROP CONSTRAINT IF EXISTS reservation_addons_addon_id_fkey;
ALTER TABLE public.reservation_services
    ADD CONSTRAINT reservation_services_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES public.service_addons(id) ON DELETE CASCADE;

--------------------------------------------------------------------------------
-- 7️⃣ RENOMBRAR ÍNDICES RELACIONADOS CON COMMON_AREAS
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_common_areas_organization_id') THEN
        ALTER INDEX public.idx_common_areas_organization_id RENAME TO idx_services_organization_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_common_areas_is_active') THEN
        ALTER INDEX public.idx_common_areas_is_active RENAME TO idx_services_is_active;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_reservations_common_area_id') THEN
        ALTER INDEX public.idx_reservations_common_area_id RENAME TO idx_reservations_service_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_maintenance_common_area_id') THEN
        ALTER INDEX public.idx_maintenance_common_area_id RENAME TO idx_maintenance_service_id;
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 8️⃣ ACTUALIZAR POLÍTICAS RLS PARA LA NUEVA TABLA services
--------------------------------------------------------------------------------
-- Public (anon) view services
DROP POLICY IF EXISTS "Public can view services" ON public.services;
CREATE POLICY "Public can view services"
    ON public.services
    FOR SELECT
    TO anon
    USING (is_active = true);

-- Admins manage services
DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Admins manage services"
    ON public.services
    FOR ALL
    TO authenticated
    USING (
        (is_admin() AND belongs_to_org(organization_id))
        OR is_super_admin()
    )
    WITH CHECK (
        (is_admin() AND belongs_to_org(organization_id))
        OR is_super_admin()
    );

--------------------------------------------------------------------------------
-- 9️⃣ LIMPIAR OBJETOS DE EMPLEADOS INNECESARIOS
--------------------------------------------------------------------------------
-- Si existieran tablas employees o employee_services creadas previamente, eliminarlas porque la arquitectura usa la tabla resources.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='employees') THEN
        DROP TABLE public.employees CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='employee_services') THEN
        DROP TABLE public.employee_services CASCADE;
    END IF;
END $$;

COMMIT;
-- ==========================================================
-- FIN DE MIGRACIÓN SEGURA
-- ==========================================================