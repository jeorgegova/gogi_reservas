-- EXTENSION (needed for UUID generation)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- INDEXES FOR BETTER QUERY PERFORMANCE
-- =========================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Common areas indexes
CREATE INDEX IF NOT EXISTS idx_common_areas_organization_id ON common_areas(organization_id);
CREATE INDEX IF NOT EXISTS idx_common_areas_is_active ON common_areas(is_active);

-- Reservations indexes (critical for date queries and joins)
CREATE INDEX IF NOT EXISTS idx_reservations_organization_id ON reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_common_area_id ON reservations(common_area_id);
CREATE INDEX IF NOT EXISTS idx_reservations_start_datetime ON reservations(start_datetime);
CREATE INDEX IF NOT EXISTS idx_reservations_end_datetime ON reservations(end_datetime);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_organization_id_start ON reservations(organization_id, start_datetime);

-- OPTIMIZATION: Composite index for efficient reservation overlap and range queries
CREATE INDEX IF NOT EXISTS idx_reservations_org_range 
ON public.reservations (organization_id, start_datetime, end_datetime);

-- AUTH TRIGGER: Automated profile creation from metadata
-- IMPORTANT: Run this in the Supabase SQL Editor if profiles are created with null fields.
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, apartment, organization_id, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'apartment',
    (new.raw_user_meta_data->>'organization_id')::uuid,
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
*/

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments(reservation_id);

-- Maintenance notices indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_organization_id ON maintenance_notices(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_common_area_id ON maintenance_notices(common_area_id);

-- =========================
-- TABLES
-- =========================

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.common_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  max_hours_per_reservation integer DEFAULT 4,
  cost_per_hour numeric DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  pricing_type text DEFAULT 'hourly'::text CHECK (pricing_type = ANY (ARRAY['hourly'::text, 'jornada'::text])),
  cost_jornada_diurna numeric DEFAULT 0,
  cost_jornada_nocturna numeric DEFAULT 0,
  cost_jornada_ambos numeric DEFAULT 0,
  jornada_hours_diurna integer DEFAULT 10,
  jornada_hours_nocturna integer DEFAULT 6,
  organization_id uuid,
  is_free boolean DEFAULT false,
  CONSTRAINT common_areas_pkey PRIMARY KEY (id),
  CONSTRAINT common_areas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.maintenance_notices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  common_area_id uuid,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  severity text DEFAULT 'info'::text CHECK (severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  organization_id uuid,
  CONSTRAINT maintenance_notices_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_notices_common_area_id_fkey FOREIGN KEY (common_area_id) REFERENCES public.common_areas(id),
  CONSTRAINT maintenance_notices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address text,
  phone text,
  login_photo_url text,
  logo_url text,
  contact_email text,
  subscription_status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  subscription_end_date timestamp without time zone,
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  transaction_id text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  validated_by uuid,
  validated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT payments_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  phone text,
  apartment text,
  role text DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  organization_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  common_area_id uuid NOT NULL,
  start_datetime timestamp with time zone NOT NULL,
  end_datetime timestamp with time zone NOT NULL,
  total_cost numeric DEFAULT 0,
  status text DEFAULT 'pending_payment'::text CHECK (status = ANY (ARRAY['pending_payment'::text, 'pending_validation'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  payment_url text,
  payment_proof_url text,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  organization_id uuid,
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT reservations_common_area_id_fkey FOREIGN KEY (common_area_id) REFERENCES public.common_areas(id),
  CONSTRAINT reservations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.subscription_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  transaction_id text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscription_payments_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id)
);
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  duration_in_days integer NOT NULL,
  max_reservations integer,
  features jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'pending'::text])),
  auto_renew boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
);


--POLICY
-- =========================================
-- 🔐 ENABLE RLS
-- =========================================
alter table public.common_areas enable row level security;
alter table public.maintenance_notices enable row level security;
alter table public.organizations enable row level security;
alter table public.payments enable row level security;
alter table public.profiles enable row level security;
alter table public.reservations enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;


-- =========================================
-- 🧠 HELPER FUNCTIONS
-- =========================================

create or replace function get_my_org_id()
returns uuid
language sql
stable
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'super_admin'
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create or replace function belongs_to_org(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and organization_id = org_id
  );
$$;


-- =========================================
-- 🌐 PUBLIC (ANON)
-- =========================================

-- reservations
create policy "Public can view reservations"
on public.reservations
for select
to anon
using (true);

create policy "Public can insert reservations"
on public.reservations
for insert
to anon
with check (true);

-- common areas
create policy "Public can view common areas"
on public.common_areas
for select
to anon
using (is_active = true);

-- organizations
create policy "Public can view organizations"
on public.organizations
for select
to anon
using (true);

-- profiles (registro)
create policy "Public can create profile"
on public.profiles
for insert
to anon
with check (true);


-- =========================================
-- 👤 AUTHENTICATED USERS
-- =========================================

-- reservations
create policy "Users view reservations in their org"
on public.reservations
for select
to authenticated
using (belongs_to_org(organization_id));

create policy "Users insert reservations"
on public.reservations
for insert
to authenticated
with check (
  auth.uid() = user_id
  and belongs_to_org(organization_id)
);

create policy "Users update own reservations"
on public.reservations
for update
to authenticated
using (auth.uid() = user_id);

-- profiles
create policy "Users view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id);


-- =========================================
-- 🏢 ADMIN (POR ORGANIZACIÓN)
-- =========================================

-- reservations
create policy "Admins manage reservations"
on public.reservations
for all
to authenticated
using (
  (is_admin() and belongs_to_org(organization_id))
  or is_super_admin()
)
with check (
  (is_admin() and belongs_to_org(organization_id))
  or is_super_admin()
);

-- common areas
create policy "Admins manage common areas"
on public.common_areas
for all
to authenticated
using (
  (is_admin() and belongs_to_org(organization_id))
  or is_super_admin()
)
with check (
  (is_admin() and belongs_to_org(organization_id))
  or is_super_admin()
);

-- maintenance
create policy "Admins manage maintenance"
on public.maintenance_notices
for all
to authenticated
using (
  (is_admin() and belongs_to_org(organization_id))
  or is_super_admin()
)
with check (
  (is_admin() and belongs_to_org(organization_id))
  or is_super_admin()
);

-- payments
create policy "Admins manage payments"
on public.payments
for all
to authenticated
using (
  is_admin() or is_super_admin()
)
with check (
  is_admin() or is_super_admin()
);


-- =========================================
-- 👑 ORGANIZATIONS (SUPER ADMIN ONLY)
-- =========================================

create policy "Super admin manage organizations"
on public.organizations
for all
to authenticated
using (is_super_admin())
with check (is_super_admin());


-- =========================================
-- 💳 SUBSCRIPTIONS (ADMIN + SUPER ADMIN)
-- =========================================

-- subscriptions
create policy "Admins manage subscriptions"
on public.subscriptions
for all
to authenticated
using (
  (is_admin() and belongs_to_org(organization_id))
  or is_super_admin()
)
with check (
  (is_admin() and belongs_to_org(organization_id))
  or is_super_admin()
);

-- insert seguro
create policy "Admins create subscriptions safely"
on public.subscriptions
for insert
to authenticated
with check (
  (
    is_admin()
    and organization_id = get_my_org_id()
  )
  or is_super_admin()
);


-- plans (solo lectura)
create policy "Authenticated users can view plans"
on public.subscription_plans
for select
to authenticated
using (true);


-- subscription payments (validando por subscription)
create policy "Admins manage subscription payments"
on public.subscription_payments
for all
to authenticated
using (
  is_super_admin()
  OR (
    is_admin()
    AND exists (
      select 1
      from public.subscriptions s
      where s.id = subscription_id
      and belongs_to_org(s.organization_id)
    )
  )
)
with check (
  is_super_admin()
  OR (
    is_admin()
    AND exists (
      select 1
      from public.subscriptions s
      where s.id = subscription_id
      and belongs_to_org(s.organization_id)
    )
  )
);