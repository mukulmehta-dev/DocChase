-- ============================================================================
-- Migration 028: Workspace Members Management RPCs
-- Adds secure RPCs for listing workspace members and adding existing users by email
-- ============================================================================

-- 1. Secure RPC to list workspace members with identity (email & full_name)
CREATE OR REPLACE FUNCTION public.get_workspace_members(p_workspace_id UUID)
RETURNS TABLE (
    id UUID,
    workspace_id UUID,
    user_id UUID,
    role TEXT,
    created_at TIMESTAMPTZ,
    email TEXT,
    full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Verify caller is a member of p_workspace_id
    IF NOT public.is_workspace_member(p_workspace_id) THEN
        RAISE EXCEPTION 'Access denied: not a member of this workspace';
    END IF;

    RETURN QUERY
    SELECT 
        wm.id,
        wm.workspace_id,
        wm.user_id,
        wm.role,
        wm.created_at,
        COALESCE(p.email, u.email::TEXT, 'Unknown')::TEXT AS email,
        p.full_name::TEXT AS full_name
    FROM public.workspace_members wm
    LEFT JOIN public.profiles p ON p.id = wm.user_id
    LEFT JOIN auth.users u ON u.id = wm.user_id
    WHERE wm.workspace_id = p_workspace_id
    ORDER BY 
        CASE wm.role 
            WHEN 'owner' THEN 1 
            WHEN 'admin' THEN 2 
            ELSE 3 
        END,
        wm.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_members(UUID) TO authenticated, service_role;

-- 2. Secure RPC for owners to add an existing registered user to the workspace
CREATE OR REPLACE FUNCTION public.add_workspace_member_by_email(
    p_workspace_id UUID,
    p_email TEXT,
    p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_target_user_id UUID;
    v_member_id UUID;
    v_user_email TEXT;
BEGIN
    -- 1. Strictly enforce caller is an owner of the workspace
    IF NOT public.is_workspace_owner(p_workspace_id) THEN
        RAISE EXCEPTION 'FORBIDDEN: Only workspace owners can add members.';
    END IF;

    -- 2. Validate role
    IF p_role NOT IN ('owner', 'admin', 'member') THEN
        RAISE EXCEPTION 'INVALID_ROLE: Role must be owner, admin, or member.';
    END IF;

    IF p_email IS NULL OR trim(p_email) = '' THEN
        RAISE EXCEPTION 'INVALID_EMAIL: Email address cannot be empty.';
    END IF;

    -- 3. Find existing user by email
    SELECT id, email::TEXT INTO v_target_user_id, v_user_email
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email));

    IF v_target_user_id IS NULL THEN
        SELECT id, email INTO v_target_user_id, v_user_email
        FROM public.profiles
        WHERE lower(email) = lower(trim(p_email));
    END IF;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: No registered account found with email %', p_email;
    END IF;

    -- 4. Check if already a member of this workspace
    IF EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id AND user_id = v_target_user_id
    ) THEN
        RAISE EXCEPTION 'ALREADY_MEMBER: User % is already a member of this workspace.', p_email;
    END IF;

    -- 5. Insert new member
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (p_workspace_id, v_target_user_id, p_role)
    RETURNING id INTO v_member_id;

    RETURN jsonb_build_object(
        'success', true,
        'member_id', v_member_id,
        'user_id', v_target_user_id,
        'email', v_user_email,
        'role', p_role
    );
END;
$$;

REVOKE ALL ON FUNCTION public.add_workspace_member_by_email(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_workspace_member_by_email(UUID, TEXT, TEXT) TO authenticated, service_role;
