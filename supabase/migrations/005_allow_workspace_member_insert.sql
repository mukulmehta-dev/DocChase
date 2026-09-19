-- Allow authenticated users to add themselves to newly created workspaces
-- and allow workspace owners to manage all members.
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;

CREATE POLICY "Owners can manage members" 
    ON public.workspace_members FOR ALL 
    USING (public.is_workspace_owner(workspace_id))
    WITH CHECK (
        auth.uid() = user_id 
        OR public.is_workspace_owner(workspace_id)
    );
