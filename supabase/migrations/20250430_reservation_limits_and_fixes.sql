-- =========================================
-- Reservation Day Limit & Fixes
-- =========================================

-- Add max_reservation_days_ahead column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS max_reservation_days_ahead integer;

-- Add jornada start/end time columns to common_areas if not exist
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS jornada_start_diurna text DEFAULT '08:00';
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS jornada_end_diurna text DEFAULT '18:00';
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS jornada_start_nocturna text DEFAULT '18:00';
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS jornada_end_nocturna text DEFAULT '23:59';

-- Enable the auth trigger with organization_id for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, apartment, organization_id, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'apartment',
    (new.raw_user_meta_data->>'organization_id')::uuid,
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
