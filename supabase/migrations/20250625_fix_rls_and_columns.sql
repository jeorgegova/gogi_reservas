-- ==========================================================
-- Fix: RLS policies and column renames for new architecture
-- Apply after the table renames (common_areas→services, etc.)
-- ==========================================================

BEGIN;

-- 1) Rename bonus_configs.common_area_id → resource_id (if not already done)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='bonus_configs' AND column_name='common_area_id'
    ) THEN
        ALTER TABLE public.bonus_configs RENAME COLUMN common_area_id TO resource_id;
    END IF;
END $$;

-- 2) Drop stale RLS policies that reference old table/column names

-- services (old: common_areas)
DROP POLICY IF EXISTS "Public can view common areas" ON public.services;
DROP POLICY IF EXISTS "Admins manage common areas" ON public.services;
DROP POLICY IF EXISTS "Public can view services" ON public.services;
DROP POLICY IF EXISTS "Admins manage services" ON public.services;

-- resource_services (old: common_area_addons)
DROP POLICY IF EXISTS "Public can view area addons" ON public.resource_services;
DROP POLICY IF EXISTS "Authenticated users view area addons" ON public.resource_services;
DROP POLICY IF EXISTS "Admins manage area addons" ON public.resource_services;
DROP POLICY IF EXISTS "Public can view resource services" ON public.resource_services;
DROP POLICY IF EXISTS "Authenticated users view resource services" ON public.resource_services;
DROP POLICY IF EXISTS "Admins manage resource services" ON public.resource_services;

-- reservation_services (old: reservation_addons)
DROP POLICY IF EXISTS "Users view reservation addons in their org" ON public.reservation_services;
DROP POLICY IF EXISTS "Admins manage reservation addons" ON public.reservation_services;
DROP POLICY IF EXISTS "Users insert reservation addons" ON public.reservation_services;
DROP POLICY IF EXISTS "Public can view reservation addons" ON public.reservation_services;
DROP POLICY IF EXISTS "Public can insert reservation addons" ON public.reservation_services;
DROP POLICY IF EXISTS "Users view reservation services" ON public.reservation_services;
DROP POLICY IF EXISTS "Admins manage reservation services" ON public.reservation_services;
DROP POLICY IF EXISTS "Users insert reservation services" ON public.reservation_services;
DROP POLICY IF EXISTS "Public can view reservation services" ON public.reservation_services;
DROP POLICY IF EXISTS "Public can insert reservation services" ON public.reservation_services;

-- 3) Ensure RLS is enabled on all new/existing tables
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_services ENABLE ROW LEVEL SECURITY;

-- 4) Create clean RLS policies for services
CREATE POLICY "Public can view services"
    ON public.services FOR SELECT TO anon
    USING (is_active = true);

CREATE POLICY "Admins manage services"
    ON public.services FOR ALL TO authenticated
    USING ((is_admin() AND belongs_to_org(organization_id)) OR is_super_admin())
    WITH CHECK ((is_admin() AND belongs_to_org(organization_id)) OR is_super_admin());

-- 5) Create clean RLS policies for resource_services
CREATE POLICY "Public can view resource services"
    ON public.resource_services FOR SELECT TO anon
    USING (true);

CREATE POLICY "Authenticated users view resource services"
    ON public.resource_services FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND belongs_to_org(r.organization_id))
    );

CREATE POLICY "Admins manage resource services"
    ON public.resource_services FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
    );

-- 6) Create clean RLS policies for reservation_services
CREATE POLICY "Public can view reservation services"
    ON public.reservation_services FOR SELECT TO anon
    USING (true);

CREATE POLICY "Public can insert reservation services"
    ON public.reservation_services FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Users view reservation services"
    ON public.reservation_services FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND belongs_to_org(r.organization_id))
    );

CREATE POLICY "Users insert reservation services"
    ON public.reservation_services FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND (auth.uid() = r.user_id AND belongs_to_org(r.organization_id)))
    );

CREATE POLICY "Admins manage reservation services"
    ON public.reservation_services FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
    );

COMMIT;
