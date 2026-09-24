-- Auto-confirm test users created during automated security testing
CREATE OR REPLACE FUNCTION public.confirm_test_user(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
    IF p_email LIKE 'docchase.sec.%@gmail.com' OR p_email = 'docchase.secondary.tester@gmail.com' THEN
        UPDATE auth.users
        SET email_confirmed_at = NOW()
        WHERE email = p_email AND email_confirmed_at IS NULL;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_test_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_test_user(TEXT) TO anon, authenticated, service_role;
