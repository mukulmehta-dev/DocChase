-- ============================================================================
-- Migration 019: Fix Optional Request Readiness & Archived Client Protections
-- ============================================================================

-- 1. Fix calculate_request_readiness to support requests with all-optional items
-- Case A: At least one required item -> READY iff all required items approved
-- Case B: Zero required items, but >= 1 total items -> READY iff all items approved
-- Case C: Zero total items -> false (not ready)
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
    v_total_items INT;
    v_total_required INT;
    v_approved_required INT;
    v_approved_total INT;
    v_is_ready BOOLEAN;
    v_request RECORD;
BEGIN
    -- Verify request exists in workspace
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE id = p_request_id AND workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found.');
    END IF;

    -- Count total items, required items, approved required items, and total approved items
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE required = true),
        COUNT(*) FILTER (WHERE required = true AND status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'approved')
    INTO v_total_items, v_total_required, v_approved_required, v_approved_total
    FROM public.request_items 
    WHERE request_id = p_request_id;

    -- Authoritative Readiness Determination
    IF v_total_required > 0 THEN
        v_is_ready := (v_approved_required = v_total_required);
    ELSIF v_total_items > 0 THEN
        v_is_ready := (v_approved_total = v_total_items);
    ELSE
        v_is_ready := false;
    END IF;

    IF v_is_ready AND v_request.status != 'ready' THEN
        -- Mark request READY and record completion time
        UPDATE public.requests 
        SET status = 'ready', completed_at = NOW(), updated_at = NOW()
        WHERE id = p_request_id;

        -- Cancel all pending scheduled reminders for this request
        UPDATE public.reminders 
        SET status = 'cancelled', updated_at = NOW()
        WHERE request_id = p_request_id AND status = 'scheduled';

        -- Write audit log using correct metadata column
        INSERT INTO public.audit_logs (
            workspace_id, action, entity_type, entity_id, metadata
        ) VALUES (
            p_workspace_id,
            'request.completed',
            'request',
            p_request_id,
            jsonb_build_object(
                'title', v_request.title,
                'reason', CASE 
                    WHEN v_total_required > 0 THEN 'All required documents approved'
                    ELSE 'All optional documents approved'
                END
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_ready', v_is_ready,
        'total_items', v_total_items,
        'total_required', v_total_required,
        'approved_required', v_approved_required,
        'approved_total', v_approved_total
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_request_readiness(UUID, UUID) TO authenticated, service_role;

-- 2. Database Protection: Prevent Creating Requests for Archived or Non-Workspace Clients
CREATE OR REPLACE FUNCTION public.check_client_active_on_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_status TEXT;
    v_client_workspace_id UUID;
BEGIN
    SELECT status, workspace_id INTO v_client_status, v_client_workspace_id
    FROM public.clients
    WHERE id = NEW.client_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Client not found.';
    END IF;

    IF v_client_workspace_id != NEW.workspace_id THEN
        RAISE EXCEPTION 'Client does not belong to the specified workspace.';
    END IF;

    IF v_client_status != 'active' THEN
        RAISE EXCEPTION 'Cannot create request for an inactive or archived client.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_client_active_on_request_insert ON public.requests;
CREATE TRIGGER trg_check_client_active_on_request_insert
    BEFORE INSERT ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.check_client_active_on_request_insert();

-- 3. Update claim_due_reminders to Prevent Claiming Reminders for Archived Clients
CREATE OR REPLACE FUNCTION public.claim_due_reminders(
    p_limit INT DEFAULT 25
)
RETURNS TABLE (
    reminder_id UUID,
    workspace_id UUID,
    request_id UUID,
    scheduled_for TIMESTAMPTZ,
    reminder_type TEXT,
    request_title TEXT,
    request_period TEXT,
    request_due_date DATE,
    request_status TEXT,
    access_token TEXT,
    client_name TEXT,
    client_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Automatically cancel any scheduled reminders for requests that are now ready or cancelled
    UPDATE public.reminders rem
    SET status = 'cancelled', updated_at = NOW()
    FROM public.requests req
    WHERE rem.request_id = req.id
      AND rem.status = 'scheduled'
      AND req.status IN ('ready', 'cancelled');

    -- 2. Claim active due reminders using FOR UPDATE SKIP LOCKED
    -- Strictly require that request is in sent/in_progress AND client is active
    RETURN QUERY
    WITH claimed AS (
        SELECT r.id
        FROM public.reminders r
        JOIN public.requests req ON req.id = r.request_id
        JOIN public.clients c ON c.id = req.client_id
        WHERE r.status = 'scheduled'
          AND r.scheduled_for <= NOW()
          AND req.status IN ('sent', 'in_progress')
          AND c.status = 'active'
        ORDER BY r.scheduled_for ASC
        LIMIT p_limit
        FOR UPDATE OF r SKIP LOCKED
    ),
    updated AS (
        UPDATE public.reminders rem
        SET status = 'processing',
            updated_at = NOW()
        FROM claimed c
        WHERE rem.id = c.id
        RETURNING rem.*
    )
    SELECT 
        u.id AS reminder_id,
        u.workspace_id,
        u.request_id,
        u.scheduled_for,
        u.reminder_type,
        req.title AS request_title,
        req.period AS request_period,
        req.due_date AS request_due_date,
        req.status::TEXT AS request_status,
        req.access_token,
        COALESCE(c.company_name, c.name, 'Client')::TEXT AS client_name,
        c.email::TEXT AS client_email
    FROM updated u
    JOIN public.requests req ON req.id = u.request_id
    JOIN public.clients c ON c.id = req.client_id;
END;
$$;
