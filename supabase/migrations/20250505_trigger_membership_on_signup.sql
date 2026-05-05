-- =========================================
-- Fix: Auto-create membership on user signup
-- =========================================
-- The trigger handle_new_user() only inserted into profiles.
-- Frontend tried to insert into memberships manually but RLS blocked it
-- because after signUp() with email confirmation, the user has no active session.
-- This fix adds membership creation inside the trigger (SECURITY DEFINER bypasses RLS).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := (new.raw_user_meta_data->>'organization_id')::uuid;

  INSERT INTO public.profiles (id, email, full_name, phone, apartment, organization_id, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'apartment',
    v_org_id,
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id);

  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.memberships (user_id, organization_id, role, phone, apartment, is_active)
    VALUES (
      new.id,
      v_org_id,
      COALESCE(new.raw_user_meta_data->>'role', 'user'),
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'apartment',
      true
    )
    ON CONFLICT (user_id, organization_id) DO UPDATE SET
      phone = COALESCE(EXCLUDED.phone, memberships.phone),
      apartment = COALESCE(EXCLUDED.apartment, memberships.apartment),
      is_active = true,
      updated_at = now();
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
