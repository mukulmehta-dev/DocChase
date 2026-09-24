-- ============================================================================
-- Migration 022: Workspace Membership & Audit Security Hardening
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fix Finding 1: Eliminate Insecure Direct Self-Insertion RLS on workspace_members
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view other members in their workspace" ON public.workspace_members;

-- Strict SELECT: Members can only view members within their own workspaces
CREATE POLICY "Members can view other members in their workspace" 
    ON public.workspace_members FOR SELECT 
    TO authenticated
    USING (workspace_id IN (SELECT current_user_workspace_ids()));

-- Strict ALL (INSERT, UPDATE, DELETE): Only verified owners of the workspace can manage members
CREATE POLICY "Owners can manage members" 
    ON public.workspace_members FOR ALL 
    TO authenticated
    USING (public.is_workspace_owner(workspace_id))
    WITH CHECK (public.is_workspace_owner(workspace_id));

-- Dedicated secure RPC for authenticated users to create additional workspaces safely
CREATE OR REPLACE FUNCTION public.create_workspace(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_workspace_id UUID;
    v_workspace RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: must be signed in to create a workspace';
    END IF;

    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Workspace name cannot be empty';
    END IF;

    -- Create workspace
    INSERT INTO public.workspaces (name, plan)
    VALUES (trim(p_name), 'free')
    RETURNING id INTO v_workspace_id;

    -- Add creator as owner (SECURITY DEFINER bypasses RLS safely)
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_user_id, 'owner');

    -- Create default free subscription
    INSERT INTO public.subscriptions (workspace_id, plan, status)
    VALUES (v_workspace_id, 'free', 'active')
    ON CONFLICT (workspace_id) DO NOTHING;

    SELECT id, name, slug, logo_url, plan, created_at, updated_at
    INTO v_workspace
    FROM public.workspaces
    WHERE id = v_workspace_id;

    RETURN jsonb_build_object(
        'id', v_workspace.id,
        'name', v_workspace.name,
        'slug', v_workspace.slug,
        'logo_url', v_workspace.logo_url,
        'plan', v_workspace.plan,
        'created_at', v_workspace.created_at,
        'updated_at', v_workspace.updated_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Fix Finding 2: Concurrency-Safe Last-Owner Protection Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tr_protect_last_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_count INTEGER;
    v_ws_exists BOOLEAN;
BEGIN
    -- Check when an owner row is deleted or an owner's role is updated away from 'owner'
    IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR 
       (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN

        -- 1. Lock the parent workspace row FOR UPDATE to serialize concurrent owner changes.
        -- If the workspace itself is being deleted in this transaction (cascade),
        -- FOUND will be false and we do not block workspace deletion.
        PERFORM 1 FROM public.workspaces WHERE id = OLD.workspace_id FOR UPDATE;

        IF FOUND THEN
            -- 2. Check remaining owners in the workspace
            SELECT COUNT(*) INTO v_owner_count
            FROM public.workspace_members
            WHERE workspace_id = OLD.workspace_id
              AND role = 'owner'
              AND id != OLD.id;

            IF v_owner_count = 0 THEN
                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'CANNOT_REMOVE_LAST_OWNER: Cannot delete the last remaining owner of workspace %', OLD.workspace_id;
                ELSE
                    RAISE EXCEPTION 'CANNOT_DEMOTE_LAST_OWNER: Cannot demote the last remaining owner of workspace %', OLD.workspace_id;
                END IF;
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_last_owner ON public.workspace_members;
CREATE TRIGGER tr_enforce_last_owner
    BEFORE UPDATE OR DELETE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_protect_last_workspace_owner();

-- ----------------------------------------------------------------------------
-- 3. Fix Finding 4: Strict Audit Log Actor ID Verification
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "System/members can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Members can insert audit logs for own identity" ON public.audit_logs;

CREATE POLICY "Members can insert audit logs for own identity" 
    ON public.audit_logs FOR INSERT 
    TO authenticated
    WITH CHECK (
        workspace_id IN (SELECT current_user_workspace_ids())
        AND (user_id IS NULL OR user_id = auth.uid())
    );
