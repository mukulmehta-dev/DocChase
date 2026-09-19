-- Migration 011: Setup Automated Recurring Reminders, Concurrency Locking & Cron Schedule
-- Enables pg_cron & pg_net, adds 'processing' status, atomic claiming RPC, and scheduled job.

-- 1. Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Update reminders table status check constraint to include 'processing'
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_status_check;
ALTER TABLE public.reminders ADD CONSTRAINT reminders_status_check 
    CHECK (status IN ('scheduled', 'processing', 'sent', 'skipped', 'failed', 'cancelled'));

-- 3. Add partial unique index to guarantee idempotency:
-- At most ONE pending ('scheduled' or 'processing') reminder can exist per request.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_reminder_per_request 
    ON public.reminders(request_id) 
    WHERE status IN ('scheduled', 'processing');

-- 4. Stored Procedure: claim_due_reminders
-- Atomically locks and claims eligible due reminders using FOR UPDATE SKIP LOCKED
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

-- 5. Stored Procedure: reset_stale_processing_reminders
-- Recovers reminders that were claimed but never finalized due to worker failure
CREATE OR REPLACE FUNCTION public.reset_stale_processing_reminders(
    p_timeout_minutes INT DEFAULT 15
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reset_count INT;
BEGIN
    UPDATE public.reminders
    SET status = 'scheduled',
        updated_at = NOW()
    WHERE status = 'processing'
      AND updated_at < (NOW() - (p_timeout_minutes || ' minutes')::INTERVAL);

    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
    RETURN v_reset_count;
END;
$$;

-- 6. Setup pg_cron Scheduled Job
-- Automatically invokes send-reminders worker every day at 09:00 UTC
DO $$
BEGIN
    -- Unschedule existing job if present
    PERFORM cron.unschedule('docchase-automated-reminders')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'docchase-automated-reminders');

    -- Schedule daily recurring job at 09:00 UTC
    PERFORM cron.schedule(
        'docchase-automated-reminders',
        '0 9 * * *',
        $cron$
        SELECT net.http_post(
            url := 'https://ygugwtflwyqtjeuwgtca.supabase.co/functions/v1/send-reminders',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'User-Agent', 'DocChase-Cron/1.0'
            ),
            body := jsonb_build_object('source', 'pg_cron')
        );
        $cron$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron job registration notice: %', SQLERRM;
END $$;
