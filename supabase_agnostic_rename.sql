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
-- 1️⃣ RENOMBRAR TABLA common_areas → services
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='common_areas') THEN
        ALTER TABLE public.common_areas RENAME TO services;
    END IF;
END $$;

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS common_areas_pkey;
ALTER TABLE public.services ADD CONSTRAINT services_pkey PRIMARY KEY (id);

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS common_areas_organization_id_fkey;
ALTER TABLE public.services
    ADD CONSTRAINT services_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

--------------------------------------------------------------------------------
-- 2️⃣ RENOMBRAR TABLA common_area_addons → resource_services
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='common_area_addons') THEN
        ALTER TABLE public.common_area_addons RENAME TO resource_services;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='resource_services' AND column_name='common_area_id') THEN
        ALTER TABLE public.resource_services RENAME COLUMN common_area_id TO resource_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='resource_services' AND column_name='addon_id') THEN
        ALTER TABLE public.resource_services RENAME COLUMN addon_id TO service_id;
    END IF;
END $$;

ALTER TABLE public.resource_services DROP CONSTRAINT IF EXISTS common_area_addons_pkey;
ALTER TABLE public.resource_services ADD CONSTRAINT resource_services_pkey PRIMARY KEY (id);

ALTER TABLE public.resource_services DROP CONSTRAINT IF EXISTS resource_services_unique;
ALTER TABLE public.resource_services ADD CONSTRAINT resource_services_unique UNIQUE (resource_id, service_id);

ALTER TABLE public.resource_services DROP CONSTRAINT IF EXISTS common_area_addons_common_area_id_fkey;
ALTER TABLE public.resource_services
    ADD CONSTRAINT resource_services_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;

ALTER TABLE public.resource_services DROP CONSTRAINT IF EXISTS common_area_addons_addon_id_fkey;
ALTER TABLE public.resource_services
    ADD CONSTRAINT resource_services_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

--------------------------------------------------------------------------------
-- 3️⃣ ACTUALIZAR COLUMNA EN reservations (common_area_id → resource_id, FK → resources)
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reservations' AND column_name='common_area_id') THEN
        ALTER TABLE public.reservations RENAME COLUMN common_area_id TO resource_id;
    END IF;
END $$;

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_common_area_id_fkey;
ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES public.resources(id);

--------------------------------------------------------------------------------
-- 4️⃣ ACTUALIZAR COLUMNA EN maintenance_notices (common_area_id → resource_id, FK → resources)
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='maintenance_notices' AND column_name='common_area_id') THEN
        ALTER TABLE public.maintenance_notices RENAME COLUMN common_area_id TO resource_id;
    END IF;
END $$;

ALTER TABLE public.maintenance_notices DROP CONSTRAINT IF EXISTS maintenance_notices_common_area_id_fkey;
ALTER TABLE public.maintenance_notices
    ADD CONSTRAINT maintenance_notices_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES public.resources(id);

--------------------------------------------------------------------------------
-- 5️⃣ RENOMBRAR reservation_addons → reservation_services
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='reservation_addons') THEN
        ALTER TABLE public.reservation_addons RENAME TO reservation_services;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reservation_services' AND column_name='addon_id') THEN
        ALTER TABLE public.reservation_services RENAME COLUMN addon_id TO service_id;
    END IF;
END $$;

ALTER TABLE public.reservation_services DROP CONSTRAINT IF EXISTS reservation_addons_pkey;
ALTER TABLE public.reservation_services ADD CONSTRAINT reservation_services_pkey PRIMARY KEY (id);

ALTER TABLE public.reservation_services DROP CONSTRAINT IF EXISTS reservation_addons_unique;
ALTER TABLE public.reservation_services ADD CONSTRAINT reservation_services_unique UNIQUE (reservation_id, service_id);

ALTER TABLE public.reservation_services DROP CONSTRAINT IF EXISTS reservation_addons_reservation_id_fkey;
ALTER TABLE public.reservation_services
    ADD CONSTRAINT reservation_services_reservation_id_fkey
        FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;

ALTER TABLE public.reservation_services DROP CONSTRAINT IF EXISTS reservation_addons_addon_id_fkey;
ALTER TABLE public.reservation_services
    ADD CONSTRAINT reservation_services_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

--------------------------------------------------------------------------------
-- 6️⃣ RENOMBRAR COLUMNA EN bonus_configs (common_area_id → resource_id)
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bonus_configs' AND column_name='common_area_id') THEN
        ALTER TABLE public.bonus_configs RENAME COLUMN common_area_id TO resource_id;
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 7️⃣ RENOMBRAR ÍNDICES
--------------------------------------------------------------------------------
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_common_areas_organization_id') THEN ALTER INDEX public.idx_common_areas_organization_id RENAME TO idx_services_organization_id; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_common_areas_is_active') THEN ALTER INDEX public.idx_common_areas_is_active RENAME TO idx_services_is_active; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_reservations_common_area_id') THEN ALTER INDEX public.idx_reservations_common_area_id RENAME TO idx_reservations_resource_id; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_maintenance_common_area_id') THEN ALTER INDEX public.idx_maintenance_common_area_id RENAME TO idx_maintenance_resource_id; END IF; END $$;

--------------------------------------------------------------------------------
-- 8️⃣ ACTUALIZAR POLÍTICAS RLS – services
--------------------------------------------------------------------------------
-- Borrar políticas viejas (heredadas de common_areas al renombrar)
DROP POLICY IF EXISTS "Public can view common areas" ON public.services;
DROP POLICY IF EXISTS "Admins manage common areas" ON public.services;
-- Crear nuevas políticas
DROP POLICY IF EXISTS "Public can view services" ON public.services;
CREATE POLICY "Public can view services"
    ON public.services
    FOR SELECT
    TO anon
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Admins manage services"
    ON public.services
    FOR ALL
    TO authenticated
    USING ((is_admin() AND belongs_to_org(organization_id)) OR is_super_admin())
    WITH CHECK ((is_admin() AND belongs_to_org(organization_id)) OR is_super_admin());

--------------------------------------------------------------------------------
-- 9️⃣ ACTUALIZAR POLÍTICAS RLS – resource_services
--------------------------------------------------------------------------------
-- Borrar políticas viejas (heredadas de common_area_addons)
DROP POLICY IF EXISTS "Public can view area addons" ON public.resource_services;
DROP POLICY IF EXISTS "Authenticated users view area addons" ON public.resource_services;
DROP POLICY IF EXISTS "Admins manage area addons" ON public.resource_services;
-- Crear nuevas políticas
DROP POLICY IF EXISTS "Public can view resource services" ON public.resource_services;
CREATE POLICY "Public can view resource services"
    ON public.resource_services
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view resource services" ON public.resource_services;
CREATE POLICY "Authenticated users view resource services"
    ON public.resource_services
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND belongs_to_org(r.organization_id))
    );

DROP POLICY IF EXISTS "Admins manage resource services" ON public.resource_services;
CREATE POLICY "Admins manage resource services"
    ON public.resource_services
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
    );

--------------------------------------------------------------------------------
-- 🔟 ACTUALIZAR POLÍTICAS RLS – reservation_services
--------------------------------------------------------------------------------
-- Borrar políticas viejas (heredadas de reservation_addons)
DROP POLICY IF EXISTS "Users view reservation addons in their org" ON public.reservation_services;
DROP POLICY IF EXISTS "Admins manage reservation addons" ON public.reservation_services;
DROP POLICY IF EXISTS "Users insert reservation addons" ON public.reservation_services;
DROP POLICY IF EXISTS "Public can view reservation addons" ON public.reservation_services;
DROP POLICY IF EXISTS "Public can insert reservation addons" ON public.reservation_services;
-- Crear nuevas políticas
DROP POLICY IF EXISTS "Users view reservation services" ON public.reservation_services;
CREATE POLICY "Users view reservation services"
    ON public.reservation_services
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND belongs_to_org(r.organization_id))
    );

DROP POLICY IF EXISTS "Admins manage reservation services" ON public.reservation_services;
CREATE POLICY "Admins manage reservation services"
    ON public.reservation_services
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
    );

DROP POLICY IF EXISTS "Users insert reservation services" ON public.reservation_services;
CREATE POLICY "Users insert reservation services"
    ON public.reservation_services
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND (auth.uid() = r.user_id AND belongs_to_org(r.organization_id)))
    );

DROP POLICY IF EXISTS "Public can view reservation services" ON public.reservation_services;
CREATE POLICY "Public can view reservation services"
    ON public.reservation_services
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Public can insert reservation services" ON public.reservation_services;
CREATE POLICY "Public can insert reservation services"
    ON public.reservation_services
    FOR INSERT
    TO anon
    WITH CHECK (true);

--------------------------------------------------------------------------------
-- 1️⃣1️⃣ LIMPIAR TABLAS DE EMPLEADOS OBSOLETAS
--------------------------------------------------------------------------------
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='employees') THEN DROP TABLE public.employees CASCADE; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='employee_services') THEN DROP TABLE public.employee_services CASCADE; END IF; END $$;

COMMIT;
-- ==========================================================
-- FIN DE MIGRACIÓN SEGURA
-- ==========================================================
