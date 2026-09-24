CREATE OR REPLACE FUNCTION public.get_test_users()
RETURNS TABLE (email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
    RETURN QUERY SELECT u.email::TEXT FROM auth.users u;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_users() TO anon, authenticated, service_role;
