-- ============================================================================
-- Migration 017: Fix clients RLS — explicit table-level GRANTs + policy hardening
-- ============================================================================
-- ROOT CAUSE
-- ----------
-- The clients table has RLS enabled and a correct workspace-scoped policy:
--
--   CREATE POLICY "Workspace members can manage clients"
--       ON public.clients FOR ALL
--       USING (workspace_id IN (SELECT current_user_workspace_ids()))
--       WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));
--
-- The policy logic is correct: current_user_workspace_ids() is SECURITY DEFINER
-- and queries workspace_members WHERE user_id = auth.uid() without RLS recursion.
--
-- HOWEVER: No migration ever explicitly granted INSERT/UPDATE/DELETE privileges
-- on the clients table to the 'authenticated' role. Multiple earlier migrations
-- (002, 008, 009) selectively revoked and re-granted privileges on other tables
-- (documents, request_items, requests) but left clients unaddressed.
--
-- In Supabase cloud, the default privilege grants depend on the 'auto_expose_new_tables'
-- setting and the exact Supabase/PostgREST version. When this setting is false or
-- the role doesn't have explicit INSERT privilege, PostgREST returns a 403/RLS error
-- even if the RLS policy would pass, because the table-level privilege check fails
-- BEFORE the RLS policy is evaluated.
--
-- Additionally, the original clients policy does not specify TO authenticated —
-- it applies to all roles. Restricting it explicitly to 'authenticated' ensures
-- that even if Postgres somehow granted anon INSERT rights on the table, the RLS
-- policy acts as a second layer of defense.
--
-- THE FIX
-- -------
-- 1. Explicitly revoke all privileges from anon on the clients table.
-- 2. Explicitly grant SELECT, INSERT, UPDATE, DELETE on clients to authenticated.
-- 3. Replace the existing "FOR ALL" policy with role-restricted split policies
--    that add "TO authenticated" to each operation, so the RLS and table-level
--    grants are perfectly aligned.
--
-- SECURITY PROPERTIES
-- -------------------
-- • RLS remains enabled on clients (not disabled, not bypassed).
-- • Anon role: zero privileges on clients table.
-- • Authenticated role: privileges exist, but are still gated by the RLS policy.
-- • RLS policy: workspace_id must be in the user's own workspace_members set.
--   current_user_workspace_ids() is SECURITY DEFINER, no recursion.
-- • A user cannot insert a client into a workspace they are not a member of.
-- • No WITH CHECK (true) broadening.
-- • workspace_members recursion fix (is_workspace_owner, migration 003) is untouched.
-- • All other tables' policies are untouched.
-- ============================================================================

-- Step 1: Revoke all privileges from anon on clients
REVOKE ALL ON public.clients FROM anon;

-- Step 2: Grant explicit DML privileges to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;

-- Step 3: Replace the generic FOR ALL policy with role-restricted split policies.
-- The USING/WITH CHECK logic is identical — only adds TO authenticated.
DROP POLICY IF EXISTS "Workspace members can manage clients" ON public.clients;

-- SELECT: authenticated members of the workspace can read their clients
CREATE POLICY "Workspace members can view clients"
    ON public.clients
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT current_user_workspace_ids()));

-- INSERT: authenticated members can create clients only in their own workspace.
-- WITH CHECK verifies the supplied workspace_id is in the user's memberships.
-- current_user_workspace_ids() is SECURITY DEFINER — no recursion risk.
CREATE POLICY "Workspace members can insert clients"
    ON public.clients
    FOR INSERT
    TO authenticated
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

-- UPDATE: members can update clients in their workspace
CREATE POLICY "Workspace members can update clients"
    ON public.clients
    FOR UPDATE
    TO authenticated
    USING (workspace_id IN (SELECT current_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

-- DELETE: members can delete clients in their workspace
CREATE POLICY "Workspace members can delete clients"
    ON public.clients
    FOR DELETE
    TO authenticated
    USING (workspace_id IN (SELECT current_user_workspace_ids()));
