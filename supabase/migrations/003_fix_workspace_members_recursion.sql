-- ============================================================================
-- Fix Infinite Recursion in workspace_members RLS Policy
-- ============================================================================

-- Helper function with SECURITY DEFINER to check owner status without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.workspace_members wm 
        WHERE wm.workspace_id = ws_id AND wm.user_id = auth.uid() AND wm.role = 'owner'
    );
$$;

-- Drop the recursive self-referencing policy and re-create using the SECURITY DEFINER function
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;

CREATE POLICY "Owners can manage members" 
    ON public.workspace_members FOR ALL 
    USING (public.is_workspace_owner(workspace_id))
    WITH CHECK (public.is_workspace_owner(workspace_id));

GRANT EXECUTE ON FUNCTION public.is_workspace_owner(UUID) TO authenticated, service_role;

