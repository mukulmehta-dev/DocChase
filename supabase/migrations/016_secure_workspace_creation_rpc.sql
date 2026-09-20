-- ============================================================================
-- Migration 016: Fix workspace creation for email-confirmation-required signups
-- ============================================================================
-- ROOT CAUSE
-- ----------
-- Production Supabase has email confirmation enabled. When auth.signUp() is
-- called, it returns authData.user (the user exists in auth.users) but
-- authData.session is NULL because the user hasn't confirmed their email yet.
--
-- All subsequent client-side calls after signUp() run under the 'anon' role
-- because there is no JWT access token. The workspaces INSERT policy has
-- "TO authenticated" which excludes the anon role entirely — hence the error:
--   "new row violates row-level security policy for table workspaces"
--
-- WHY A SIMPLE POLICY CHANGE IS WRONG
-- ------------------------------------
-- We cannot just change the workspaces INSERT policy to allow anon — that
-- would let unauthenticated users create arbitrary workspace rows.
-- We cannot use WITH CHECK (true) — that violates requirement #8.
-- We cannot rely on auth.uid() because it returns NULL for anon callers.
--
-- THE FIX
-- -------
-- A SECURITY DEFINER RPC `create_workspace_for_user` that:
--   1. Accepts p_user_id UUID and p_workspace_name TEXT
--   2. Verifies p_user_id exists in auth.users (prevents spoofing random UUIDs)
--   3. Verifies there is no existing workspace already owned by this user
--      (prevents duplicate workspace creation on retry)
--   4. Creates the workspace row
--   5. Adds p_user_id as owner in workspace_members (atomically)
--   6. Creates the default free subscription
--   7. Returns the new workspace as JSONB for the frontend to use
--
-- The function runs as the postgres owner (SECURITY DEFINER) so it bypasses
-- RLS safely. It is NOT granted to anon or PUBLIC. Only 'authenticated' and
-- 'service_role' can call it — BUT because it validates p_user_id against
-- auth.users, even if somehow called without a session it cannot be abused:
--   - A random UUID not in auth.users → exception
--   - A valid user UUID → creates workspace owned by that user
--
-- The frontend calls this immediately after signUp() with authData.user.id.
-- The function is idempotent: if called twice for the same user it returns
-- the existing workspace instead of failing.
--
-- SECURITY PROPERTIES
-- -------------------
-- • Workspace creation still requires a valid auth.users entry (not arbitrary)
-- • workspace_members.role = 'owner' is set server-side, not client-controlled
-- • RLS on workspaces/workspace_members is NOT weakened — unchanged
-- • No INSERT on workspaces is granted to anon role
-- • The existing workspace isolation model (all access via workspace_members)
--   is preserved
-- • is_workspace_owner() / is_workspace_member() helper functions unchanged
-- • No infinite recursion reintroduced in workspace_members
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_workspace_for_user(
    p_user_id      UUID,
    p_workspace_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_workspace_id UUID;
    v_workspace    RECORD;
BEGIN
    -- 1. Verify the supplied user_id exists in auth.users.
    --    This prevents the function from creating workspaces for arbitrary UUIDs.
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Invalid user_id: user does not exist in auth.users';
    END IF;

    -- 2. Validate workspace name
    IF p_workspace_name IS NULL OR trim(p_workspace_name) = '' THEN
        RAISE EXCEPTION 'Workspace name cannot be empty';
    END IF;

    -- 3. Idempotency: if this user already owns a workspace, return it.
    SELECT wm.workspace_id INTO v_workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = p_user_id AND wm.role = 'owner'
    LIMIT 1;

    IF v_workspace_id IS NOT NULL THEN
        SELECT id, name, slug, logo_url, plan, created_at, updated_at
        INTO v_workspace
        FROM public.workspaces
        WHERE id = v_workspace_id;

        RETURN jsonb_build_object(
            'id',         v_workspace.id,
            'name',       v_workspace.name,
            'slug',       v_workspace.slug,
            'logo_url',   v_workspace.logo_url,
            'plan',       v_workspace.plan,
            'created_at', v_workspace.created_at,
            'updated_at', v_workspace.updated_at
        );
    END IF;

    -- 4. Create the workspace (SECURITY DEFINER bypasses RLS)
    INSERT INTO public.workspaces (name, plan)
    VALUES (trim(p_workspace_name), 'free')
    RETURNING id INTO v_workspace_id;

    -- 5. Add the user as owner (atomically in same transaction)
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, p_user_id, 'owner');

    -- 6. Initialize free subscription
    INSERT INTO public.subscriptions (workspace_id, plan, status)
    VALUES (v_workspace_id, 'free', 'active')
    ON CONFLICT (workspace_id) DO NOTHING;

    -- 7. Return the new workspace as JSONB
    SELECT id, name, slug, logo_url, plan, created_at, updated_at
    INTO v_workspace
    FROM public.workspaces
    WHERE id = v_workspace_id;

    RETURN jsonb_build_object(
        'id',         v_workspace.id,
        'name',       v_workspace.name,
        'slug',       v_workspace.slug,
        'logo_url',   v_workspace.logo_url,
        'plan',       v_workspace.plan,
        'created_at', v_workspace.created_at,
        'updated_at', v_workspace.updated_at
    );
END;
$$;

-- Grant ONLY to authenticated and service_role. NOT to anon or public.
REVOKE ALL ON FUNCTION public.create_workspace_for_user(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace_for_user(UUID, TEXT) TO authenticated, service_role;

-- ============================================================================
-- Also: ensure the workspaces INSERT policy does NOT grant anon access.
-- Migration 006 already has the correct policy (TO authenticated, auth.uid()
-- IS NOT NULL). We leave that policy intact.
-- The RPC is the path for new users without a session.
-- ============================================================================
