-- =========================================
-- Add-ons, Fixed Pricing & Operation Schedule
-- =========================================

-- Update pricing_type constraint to include 'fixed'
ALTER TABLE public.common_areas DROP CONSTRAINT IF EXISTS common_areas_pricing_type_check;
ALTER TABLE public.common_areas ADD CONSTRAINT common_areas_pricing_type_check 
  CHECK (pricing_type = ANY (ARRAY['hourly', 'jornada', 'fixed']));

-- Add fixed_cost and estimated_duration to common_areas
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS fixed_cost numeric DEFAULT 0;
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer DEFAULT 60;

-- Create service_addons table (org-level pool, NOT tied to a specific area)
CREATE TABLE IF NOT EXISTS public.service_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  base_cost numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_addons_pkey PRIMARY KEY (id),
  CONSTRAINT service_addons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Create junction table: area <-> addon with custom price override
CREATE TABLE IF NOT EXISTS public.common_area_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  common_area_id uuid NOT NULL,
  addon_id uuid NOT NULL,
  custom_price numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT common_area_addons_pkey PRIMARY KEY (id),
  CONSTRAINT common_area_addons_common_area_id_fkey FOREIGN KEY (common_area_id) REFERENCES public.common_areas(id) ON DELETE CASCADE,
  CONSTRAINT common_area_addons_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.service_addons(id) ON DELETE CASCADE,
  CONSTRAINT common_area_addons_unique UNIQUE (common_area_id, addon_id)
);

-- Create operation_schedules table
CREATE TABLE IF NOT EXISTS public.operation_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '18:00',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT operation_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT operation_schedules_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT operation_schedules_unique_org_day UNIQUE (organization_id, day_of_week)
);

-- reservation_addons junction table (stores the actual price at time of booking)
CREATE TABLE IF NOT EXISTS public.reservation_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  addon_id uuid NOT NULL,
  charged_price numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_addons_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_addons_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE,
  CONSTRAINT reservation_addons_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.service_addons(id) ON DELETE CASCADE,
  CONSTRAINT reservation_addons_unique UNIQUE (reservation_id, addon_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_addons_organization_id ON public.service_addons(organization_id);
CREATE INDEX IF NOT EXISTS idx_common_area_addons_common_area_id ON public.common_area_addons(common_area_id);
CREATE INDEX IF NOT EXISTS idx_common_area_addons_addon_id ON public.common_area_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_operation_schedules_organization_id ON public.operation_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_reservation_addons_reservation_id ON public.reservation_addons(reservation_id);

-- Enable RLS
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_area_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_addons (org pool)
CREATE POLICY "Public can view service addons"
  ON public.service_addons FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated users view service addons"
  ON public.service_addons FOR SELECT TO authenticated
  USING (belongs_to_org(organization_id));

CREATE POLICY "Admins manage service addons"
  ON public.service_addons FOR ALL TO authenticated
  USING (
    (is_admin() AND belongs_to_org(organization_id))
    OR is_super_admin()
  )
  WITH CHECK (
    (is_admin() AND belongs_to_org(organization_id))
    OR is_super_admin()
  );

-- RLS Policies for common_area_addons
CREATE POLICY "Public can view area addons"
  ON public.common_area_addons FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated users view area addons"
  ON public.common_area_addons FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.common_areas ca WHERE ca.id = common_area_id AND belongs_to_org(ca.organization_id))
  );

CREATE POLICY "Admins manage area addons"
  ON public.common_area_addons FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.common_areas ca WHERE ca.id = common_area_id AND ((is_admin() AND belongs_to_org(ca.organization_id)) OR is_super_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.common_areas ca WHERE ca.id = common_area_id AND ((is_admin() AND belongs_to_org(ca.organization_id)) OR is_super_admin()))
  );

-- RLS Policies for operation_schedules
CREATE POLICY "Public can view operation schedules"
  ON public.operation_schedules FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated users view operation schedules"
  ON public.operation_schedules FOR SELECT TO authenticated
  USING (belongs_to_org(organization_id));

CREATE POLICY "Admins manage operation schedules"
  ON public.operation_schedules FOR ALL TO authenticated
  USING (
    (is_admin() AND belongs_to_org(organization_id))
    OR is_super_admin()
  )
  WITH CHECK (
    (is_admin() AND belongs_to_org(organization_id))
    OR is_super_admin()
  );

-- RLS Policies for reservation_addons
CREATE POLICY "Users view reservation addons in their org"
  ON public.reservation_addons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND belongs_to_org(r.organization_id)
    )
  );

CREATE POLICY "Admins manage reservation addons"
  ON public.reservation_addons FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin())
    )
  );

CREATE POLICY "Users insert reservation addons"
  ON public.reservation_addons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND (auth.uid() = r.user_id AND belongs_to_org(r.organization_id))
    )
  );

CREATE POLICY "Public can view reservation addons"
  ON public.reservation_addons FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public can insert reservation addons"
  ON public.reservation_addons FOR INSERT TO anon
  WITH CHECK (true);
