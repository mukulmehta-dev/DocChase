-- ============================================================================
-- Migration 020: Enforce Active Client Reactivation Quotas & Storage Limits
-- ============================================================================

-- 1. Extend public.subscriptions with stripe_event_created for webhook ordering safety
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_event_created BIGINT DEFAULT 0;

-- 2. Update get_workspace_entitlements to accurately count active clients
CREATE OR REPLACE FUNCTION public.get_workspace_entitlements(p_workspace_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_sub RECORD;
    v_effective_plan TEXT := 'free';
    v_status TEXT := 'active';
    v_client_limit INT := 3;
    v_active_request_limit INT := 1;
    v_ai_checklist_enabled BOOLEAN := false;
    v_ai_doc_assistance_enabled BOOLEAN := false;
    v_storage_limit_mb INT := 500;
    v_custom_branding_enabled BOOLEAN := false;
    v_cancel_at_period_end BOOLEAN := false;
    v_current_period_end TIMESTAMPTZ := NULL;
    v_active_clients_count INT := 0;
    v_active_requests_count INT := 0;
    v_current_storage_bytes BIGINT := 0;
BEGIN
    -- Verify workspace exists
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = p_workspace_id) THEN
        RAISE EXCEPTION 'Workspace not found';
    END IF;

    -- Fetch current subscription
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE workspace_id = p_workspace_id;

    IF FOUND THEN
        v_status := v_sub.status;
        v_cancel_at_period_end := COALESCE(v_sub.cancel_at_period_end, false);
        v_current_period_end := v_sub.current_period_end;

        -- Determine effective plan based on subscription state
        IF v_sub.status IN ('active', 'trialing') THEN
            IF v_cancel_at_period_end AND v_current_period_end IS NOT NULL AND v_current_period_end < NOW() THEN
                -- Canceled period has expired
                v_effective_plan := 'free';
                v_status := 'canceled';
            ELSE
                -- Active or canceling at period end (still in valid paid period)
                v_effective_plan := COALESCE(v_sub.plan, 'free');
            END IF;
        ELSIF v_sub.status IN ('canceled', 'incomplete_expired', 'unpaid') THEN
            v_effective_plan := 'free';
        ELSE
            v_effective_plan := COALESCE(v_sub.plan, 'free');
        END IF;
    END IF;

    -- Apply plan quota values
    IF v_effective_plan = 'pro' THEN
        v_client_limit := 100;
        v_active_request_limit := 500;
        v_ai_checklist_enabled := true;
        v_ai_doc_assistance_enabled := true;
        v_storage_limit_mb := 25000;
        v_custom_branding_enabled := true;
    ELSIF v_effective_plan = 'starter' THEN
        v_client_limit := 15;
        v_active_request_limit := 50;
        v_ai_checklist_enabled := true;
        v_ai_doc_assistance_enabled := false;
        v_storage_limit_mb := 5000;
        v_custom_branding_enabled := false;
    ELSE
        -- Free plan
        v_effective_plan := 'free';
        v_client_limit := 3;
        v_active_request_limit := 1;
        v_ai_checklist_enabled := false;
        v_ai_doc_assistance_enabled := false;
        v_storage_limit_mb := 500;
        v_custom_branding_enabled := false;
    END IF;

    -- Count active clients (strictly active status)
    SELECT COUNT(*) INTO v_active_clients_count
    FROM public.clients
    WHERE workspace_id = p_workspace_id
      AND status = 'active';

    -- Count active requests (status NOT IN ('ready', 'cancelled'))
    SELECT COUNT(*) INTO v_active_requests_count
    FROM public.requests
    WHERE workspace_id = p_workspace_id
      AND status NOT IN ('ready', 'cancelled');

    -- Calculate total workspace storage used in bytes
    SELECT COALESCE(SUM(file_size), 0) INTO v_current_storage_bytes
    FROM public.documents
    WHERE workspace_id = p_workspace_id;

    RETURN jsonb_build_object(
        'workspace_id', p_workspace_id,
        'plan', v_effective_plan,
        'status', v_status,
        'client_limit', v_client_limit,
        'active_clients_count', v_active_clients_count,
        'active_request_limit', v_active_request_limit,
        'active_requests_count', v_active_requests_count,
        'ai_checklist_enabled', v_ai_checklist_enabled,
        'ai_doc_assistance_enabled', v_ai_doc_assistance_enabled,
        'storage_limit_mb', v_storage_limit_mb,
        'storage_used_bytes', v_current_storage_bytes,
        'custom_branding_enabled', v_custom_branding_enabled,
        'cancel_at_period_end', v_cancel_at_period_end,
        'current_period_end', v_current_period_end
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_workspace_entitlements(UUID) TO anon, authenticated, service_role;

-- 3. Atomic Server-Side Client Limit Enforcement (Guards INSERT and UPDATE to active)
CREATE OR REPLACE FUNCTION public.enforce_client_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_sub RECORD;
    v_effective_plan TEXT := 'free';
    v_client_limit INT := 3;
    v_current_count INT := 0;
    v_is_activating BOOLEAN := false;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_is_activating := (NEW.status = 'active');
    ELSIF TG_OP = 'UPDATE' THEN
        v_is_activating := (NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active'));
    END IF;

    IF NOT v_is_activating THEN
        RETURN NEW;
    END IF;

    -- ATOMIC CONCURRENCY GUARD:
    -- Lock the workspace row for update so concurrent client activations serialize strictly
    PERFORM 1 FROM public.workspaces WHERE id = NEW.workspace_id FOR UPDATE;

    -- Determine effective plan
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE workspace_id = NEW.workspace_id;

    IF FOUND THEN
        IF v_sub.status IN ('active', 'trialing') THEN
            IF COALESCE(v_sub.cancel_at_period_end, false) AND v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end < NOW() THEN
                v_effective_plan := 'free';
            ELSE
                v_effective_plan := COALESCE(v_sub.plan, 'free');
            END IF;
        ELSIF v_sub.status IN ('canceled', 'incomplete_expired', 'unpaid') THEN
            v_effective_plan := 'free';
        ELSE
            v_effective_plan := COALESCE(v_sub.plan, 'free');
        END IF;
    END IF;

    -- Limits
    IF v_effective_plan = 'pro' THEN
        v_client_limit := 100;
    ELSIF v_effective_plan = 'starter' THEN
        v_client_limit := 15;
    ELSE
        v_client_limit := 3;
    END IF;

    -- Count existing active clients (excluding self if update)
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.clients
        WHERE workspace_id = NEW.workspace_id AND status = 'active';
    ELSE
        SELECT COUNT(*) INTO v_current_count
        FROM public.clients
        WHERE workspace_id = NEW.workspace_id AND status = 'active' AND id <> NEW.id;
    END IF;

    IF v_current_count >= v_client_limit THEN
        RAISE EXCEPTION 'PLAN_LIMIT_REACHED: Workspace active client limit reached (% of % on % plan). Please upgrade your subscription to activate more clients.',
            v_current_count, v_client_limit, UPPER(v_effective_plan);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_client_limit ON public.clients;
CREATE TRIGGER tr_enforce_client_limit
BEFORE INSERT OR UPDATE OF status ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.enforce_client_limit();

-- 4. Atomic Server-Side Workspace Storage Quota Enforcement
CREATE OR REPLACE FUNCTION public.enforce_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_entitlements JSONB;
    v_storage_limit_bytes BIGINT;
    v_current_storage_bytes BIGINT := 0;
BEGIN
    -- ATOMIC CONCURRENCY GUARD:
    PERFORM 1 FROM public.workspaces WHERE id = NEW.workspace_id FOR UPDATE;

    -- Retrieve entitlements
    v_entitlements := public.get_workspace_entitlements(NEW.workspace_id);
    v_storage_limit_bytes := (v_entitlements->>'storage_limit_mb')::BIGINT * 1024 * 1024;

    -- Calculate current workspace storage used
    SELECT COALESCE(SUM(file_size), 0) INTO v_current_storage_bytes
    FROM public.documents
    WHERE workspace_id = NEW.workspace_id;

    -- Validate that new upload does not exceed workspace quota
    IF (v_current_storage_bytes + NEW.file_size) > v_storage_limit_bytes THEN
        RAISE EXCEPTION 'STORAGE_LIMIT_EXCEEDED: Workspace storage limit reached (% MB of % MB on % plan). Please upgrade your subscription to upload more files.',
            ROUND(v_current_storage_bytes / (1024.0 * 1024.0), 1),
            (v_entitlements->>'storage_limit_mb')::INT,
            UPPER(v_entitlements->>'plan');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_storage_limit ON public.documents;
CREATE TRIGGER tr_enforce_storage_limit
BEFORE INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.enforce_storage_limit();
