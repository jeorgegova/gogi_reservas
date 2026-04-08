-- Function to check if email exists in profiles (publicly accessible)
CREATE OR REPLACE FUNCTION public.check_user_exists(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with service role privileges
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE email = email_to_check
    );
END;
$$;

-- Grant execute to everyone (anon and authenticated)
GRANT EXECUTE ON FUNCTION public.check_user_exists(text) TO anon, authenticated;
