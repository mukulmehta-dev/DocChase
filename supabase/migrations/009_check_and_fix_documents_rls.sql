-- ============================================================================
-- Migration 009: Revoke from PUBLIC and verify RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_table_rls(t TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_rec RECORD;
    v_policies JSONB;
BEGIN
    SELECT relname, relrowsecurity, relforcerowsecurity 
    INTO v_rec
    FROM pg_class 
    WHERE relname = t AND relnamespace = 'public'::regnamespace;

    SELECT jsonb_agg(to_jsonb(p))
    INTO v_policies
    FROM pg_policies p
    WHERE tablename = t AND schemaname = 'public';

    RETURN jsonb_build_object(
        'table', to_jsonb(v_rec),
        'policies', v_policies
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_table_rls(TEXT) TO anon, authenticated, service_role;

-- Revoke all table privileges from PUBLIC
REVOKE ALL ON public.documents FROM PUBLIC;
REVOKE ALL ON public.documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
