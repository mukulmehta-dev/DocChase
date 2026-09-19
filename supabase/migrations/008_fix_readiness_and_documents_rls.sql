-- ============================================================================
-- Migration 008: Add updated_at to reminders & harden documents RLS against anon
-- ============================================================================

-- 1. Ensure reminders has updated_at column required by calculate_request_readiness
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure calculate_request_readiness RPC handles status transition cleanly
CREATE OR REPLACE FUNCTION public.calculate_request_readiness(
    p_workspace_id UUID,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_required INT;
    v_approved_required INT;
    v_is_ready BOOLEAN;
    v_request RECORD;
BEGIN
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE id = p_request_id AND workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found.');
    END IF;

    -- Count total required items and how many of those are approved
    SELECT 
        COUNT(*) FILTER (WHERE required = true),
        COUNT(*) FILTER (WHERE required = true AND status = 'approved')
    INTO v_total_required, v_approved_required
    FROM public.request_items 
    WHERE request_id = p_request_id;

    v_is_ready := (v_total_required > 0 AND v_approved_required = v_total_required);

    IF v_is_ready AND v_request.status != 'ready' THEN
        -- Mark request READY and record completion time
        UPDATE public.requests 
        SET status = 'ready', completed_at = NOW(), updated_at = NOW()
        WHERE id = p_request_id;

        -- Cancel all pending scheduled reminders for this request
        UPDATE public.reminders 
        SET status = 'cancelled', updated_at = NOW()
        WHERE request_id = p_request_id AND status = 'scheduled';

        -- Write audit log using correct column names
        INSERT INTO public.audit_logs (
            workspace_id, action, entity_type, entity_id, metadata
        ) VALUES (
            p_workspace_id,
            'request.completed',
            'request',
            p_request_id,
            jsonb_build_object(
                'title', v_request.title,
                'reason', 'All required documents approved'
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_ready', v_is_ready,
        'total_required', v_total_required,
        'approved_required', v_approved_required
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_request_readiness(UUID, UUID) TO authenticated, service_role;

-- 3. Strictly harden documents table against anonymous inserts
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

DROP POLICY IF EXISTS "Workspace members can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Workspace members can view documents" ON public.documents;
DROP POLICY IF EXISTS "Workspace members can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Workspace members can update documents" ON public.documents;
DROP POLICY IF EXISTS "Workspace members can delete documents" ON public.documents;

CREATE POLICY "Workspace members can view documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT current_user_workspace_ids()));

CREATE POLICY "Workspace members can insert documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

CREATE POLICY "Workspace members can update documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (workspace_id IN (SELECT current_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

CREATE POLICY "Workspace members can delete documents"
    ON public.documents FOR DELETE
    TO authenticated
    USING (workspace_id IN (SELECT current_user_workspace_ids()));

-- 4. Strictly harden request_items table against anonymous inserts
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.request_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_items TO authenticated;
