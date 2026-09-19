-- Fix: Allow authenticated users to create workspaces and insert/select their initial membership
DROP POLICY IF EXISTS "Authenticated users can create workspace" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspace" 
    ON public.workspaces FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view own membership" ON public.workspace_members;
CREATE POLICY "Users can view own membership" 
    ON public.workspace_members FOR SELECT 
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own membership" ON public.workspace_members;
CREATE POLICY "Users can insert own membership" 
    ON public.workspace_members FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id = auth.uid() OR public.is_workspace_owner(workspace_id));
