-- ==========================================================
-- Add-ons & Service Images  (rediseñado: addons globales reutilizables)
--   - image_url column on services
--   - service_addons table (pool global de adicionales, por org)
--   - service_service_addons (junction: servicio ↔ adicional)
--   - reservation_addons (adicionales incluidos en una reserva)
-- ==========================================================

BEGIN;

-- 1) image_url on services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url text;

-- 2) Drop old service_addons if it has a service_id column (previous design)
DROP TABLE IF EXISTS public.service_addons CASCADE;

-- 3) Create service_addons as global pool (no service_id FK)
CREATE TABLE IF NOT EXISTS public.service_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  additional_cost numeric DEFAULT 0,
  additional_duration_minutes integer DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_addons_pkey PRIMARY KEY (id),
  CONSTRAINT service_addons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_addons_organization_id ON public.service_addons(organization_id);

ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view service addons" ON public.service_addons;
CREATE POLICY "Public can view service addons"
  ON public.service_addons FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage service addons" ON public.service_addons;
CREATE POLICY "Admins manage service addons"
  ON public.service_addons FOR ALL TO authenticated
  USING ((is_admin() AND belongs_to_org(organization_id)) OR is_super_admin())
  WITH CHECK ((is_admin() AND belongs_to_org(organization_id)) OR is_super_admin());

-- 4) Junction table: service ↔ addon (many-to-many)
CREATE TABLE IF NOT EXISTS public.service_addon_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  addon_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_addon_links_pkey PRIMARY KEY (id),
  CONSTRAINT service_addon_links_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE,
  CONSTRAINT service_addon_links_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.service_addons(id) ON DELETE CASCADE,
  CONSTRAINT service_addon_links_unique UNIQUE (service_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_service_addon_links_service_id ON public.service_addon_links(service_id);

ALTER TABLE public.service_addon_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view addon links" ON public.service_addon_links;
CREATE POLICY "Public can view addon links"
  ON public.service_addon_links FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Admins manage addon links" ON public.service_addon_links;
CREATE POLICY "Admins manage addon links"
  ON public.service_addon_links FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND ((is_admin() AND belongs_to_org(s.organization_id)) OR is_super_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND ((is_admin() AND belongs_to_org(s.organization_id)) OR is_super_admin()))
  );

-- 5) reservation_addons (junction reservation ↔ addon)
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

CREATE INDEX IF NOT EXISTS idx_reservation_addons_reservation_id ON public.reservation_addons(reservation_id);

ALTER TABLE public.reservation_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view reservation addons" ON public.reservation_addons;
CREATE POLICY "Public can view reservation addons"
  ON public.reservation_addons FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can insert reservation addons" ON public.reservation_addons;
CREATE POLICY "Public can insert reservation addons"
  ON public.reservation_addons FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users view reservation addons" ON public.reservation_addons;
CREATE POLICY "Users view reservation addons"
  ON public.reservation_addons FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND belongs_to_org(r.organization_id))
  );

DROP POLICY IF EXISTS "Users insert reservation addons" ON public.reservation_addons;
CREATE POLICY "Users insert reservation addons"
  ON public.reservation_addons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND (auth.uid() = r.user_id AND belongs_to_org(r.organization_id)))
  );

DROP POLICY IF EXISTS "Admins manage reservation addons" ON public.reservation_addons;
CREATE POLICY "Admins manage reservation addons"
  ON public.reservation_addons FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
  );

COMMIT;
