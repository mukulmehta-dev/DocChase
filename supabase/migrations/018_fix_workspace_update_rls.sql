-- ============================================================================
-- Migration 018: Fix workspaces UPDATE RLS policy scoping bug
-- ============================================================================
-- ROOT CAUSE
-- ----------
-- In migration 001_initial_schema.sql (line 285):
--
--   CREATE POLICY "Workspace owners can update workspace" 
--       ON public.workspaces FOR UPDATE 
--       USING (
--           EXISTS (
--               SELECT 1 FROM public.workspace_members 
--               WHERE workspace_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
--           )
--       );
--
-- Inside the subquery `SELECT 1 FROM public.workspace_members`, the unqualified
-- column identifier `id` resolves to the inner table's column `workspace_members.id`
-- instead of the outer table's column `public.workspaces.id`.
-- Because `workspace_members.workspace_id = workspace_members.id` compares the
-- foreign key UUID against the membership row's primary key UUID, it evaluates
-- to FALSE for all rows, causing legitimate workspace updates by owners and admins
-- to return 0 rows.
--
-- In addition, no WITH CHECK clause was explicitly declared, and explicit
-- table-level UPDATE grant to the 'authenticated' role was not guaranteed.
--
-- THE FIX
-- -------
-- 1. Create a dedicated SECURITY DEFINER helper function `is_workspace_admin_or_owner(ws_id UUID)`
--    matching the existing architectural pattern of `is_workspace_owner` and `is_workspace_member`.
--    This avoids any SQL scoping ambiguity and avoids RLS recursion when querying workspace_members.
-- 2. Drop the broken policy `"Workspace owners can update workspace"` on `public.workspaces`.
-- 3. Create the corrected policy `"Workspace owners and admins can update workspace"`
--    restricted `TO authenticated`, with both USING and WITH CHECK evaluating `is_workspace_admin_or_owner(id)`.
-- 4. Explicitly grant UPDATE on `public.workspaces` to `authenticated`.
--
-- AUTHORIZATION REQUIREMENTS
-- --------------------------
-- • owner  → can update workspace
-- • admin  → can update workspace
-- • member → cannot update workspace (denied / 0 rows affected)
-- • user from another workspace → cannot update workspace (denied / 0 rows affected)
-- • anon   → cannot update workspace
-- • existing `create_workspace_for_user` RPC and other policies untouched
-- ============================================================================

-- Step 1: Create helper function to check owner/admin status without recursion or scoping ambiguity
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(ws_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.workspace_members wm 
        WHERE wm.workspace_id = ws_id 
          AND wm.user_id = auth.uid() 
          AND wm.role IN ('owner', 'admin')
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_admin_or_owner(UUID) TO authenticated, service_role;

-- Step 2: Grant explicit UPDATE privilege on public.workspaces to authenticated role
GRANT UPDATE ON public.workspaces TO authenticated;

-- Step 3: Replace the broken UPDATE policy with corrected policy
DROP POLICY IF EXISTS "Workspace owners can update workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update workspace" ON public.workspaces;

CREATE POLICY "Workspace owners and admins can update workspace" 
    ON public.workspaces FOR UPDATE 
    TO authenticated 
    USING (public.is_workspace_admin_or_owner(id))
    WITH CHECK (public.is_workspace_admin_or_owner(id));
