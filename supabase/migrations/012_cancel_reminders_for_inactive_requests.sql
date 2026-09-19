-- Migration 012: Cancel scheduled reminders for ready or cancelled requests in claim_due_reminders

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
    RETURN QUERY
    WITH claimed AS (
        SELECT r.id
        FROM public.reminders r
        JOIN public.requests req ON req.id = r.request_id
        WHERE r.status = 'scheduled'
          AND r.scheduled_for <= NOW()
          AND req.status IN ('sent', 'in_progress')
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
    LEFT JOIN public.clients c ON c.id = req.client_id;
END;
$$;
