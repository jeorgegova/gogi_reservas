-- ==========================================================
-- resource_addon_configs: controla qué adicionales están
-- disponibles por empleado + servicio
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.resource_addon_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.service_addons(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT resource_addon_configs_pkey PRIMARY KEY (id),
  CONSTRAINT resource_addon_configs_unique UNIQUE (resource_id, service_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_addon_configs_resource_service
  ON public.resource_addon_configs(resource_id, service_id);

ALTER TABLE public.resource_addon_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view resource addon configs"
  ON public.resource_addon_configs FOR SELECT TO anon
  USING (true);

CREATE POLICY "Admins manage resource addon configs"
  ON public.resource_addon_configs FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND ((is_admin() AND belongs_to_org(r.organization_id)) OR is_super_admin()))
  );
