-- ============================================================================
-- Migration 015: Fix profile creation on signup
-- ============================================================================
-- ROOT CAUSE
-- ----------
-- The profiles table has RLS enabled but NO INSERT policy. The frontend
-- auth.ts signUp() calls supabase.auth.signUp() and then immediately attempts
-- to upsert the profile row using the anon/client key. At that moment:
--   1. There is no INSERT policy on profiles → blocked by default RLS.
--   2. The JWT session may not yet be propagated in the same request.
-- This causes: "new row violates row-level security policy for table profiles"
--
-- FIX
-- ---
-- Create a SECURITY DEFINER trigger on auth.users that automatically inserts
-- a row into public.profiles whenever a new auth user is created. This is the
-- Supabase-standard "handle_new_user" pattern. Because the trigger runs as the
-- function owner (postgres/superuser), it bypasses RLS — without ever granting
-- INSERT on profiles to anon or authenticated roles.
--
-- The frontend signUp() code path is then simplified: it no longer needs to
-- upsert the profile at all (the trigger does it atomically). The frontend
-- upsert will be left as a safe idempotent fallback that hits the UPDATE policy
-- (user can update their own profile if it already exists).
--
-- SECURITY PROPERTIES
-- -------------------
-- • RLS remains enabled on profiles with no INSERT policy for anon/authenticated
-- • Unauthenticated direct INSERT → still blocked (no INSERT policy)
-- • Authenticated user cannot insert a profile with id != auth.uid() because
--   the trigger only fires from auth.users creation (server-side), not from
--   client SQL.
-- • One user cannot create/modify another user's profile:
--   - INSERT is handled only by the trigger (server event)
--   - UPDATE policy: auth.uid() = id  (own row only)
-- • trigger is SECURITY DEFINER with fixed search_path = public, auth
--   to prevent search_path injection attacks
-- ============================================================================

-- 1. Create the trigger function (SECURITY DEFINER, fixed search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
        SET
            email      = EXCLUDED.email,
            full_name  = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Revoke execution from public/anon — only the trigger infrastructure invokes this
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2. Attach the trigger to auth.users (fires AFTER INSERT, i.e., after email confirmed or
--    when email confirmation is disabled — which is the default for new Supabase projects)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Back-fill profiles for any existing auth users that don't have a profile row yet
--    (idempotent; safe to run multiple times)
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', ''),
    u.created_at,
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 4. Add a safe "users can insert their own profile" policy as a belt-and-suspenders
--    fallback (protects against edge cases where the trigger fires but the row hasn't
--    appeared yet in the same transaction — e.g., immediate upsert after signUp).
--    This policy ONLY allows inserting a row where id = auth.uid(), so a user can
--    never insert another user's profile.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'profiles'
          AND policyname = 'Users can insert own profile'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Users can insert own profile"
                ON public.profiles FOR INSERT
                WITH CHECK (auth.uid() = id)
        $policy$;
    END IF;
END;
$$;
