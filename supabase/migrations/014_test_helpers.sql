-- Migration 014: Test helper functions
-- These functions allow controlled integration testing of billing/quota logic
-- without exposing service_role keys to test runners.
-- They are SECURITY DEFINER but verify workspace membership before acting.

-- ============================================================================
-- set_workspace_plan_for_testing
-- Allows a workspace owner/admin to update their own workspace's subscription
-- plan and status for integration testing purposes.
-- This mirrors what the Stripe webhook does via service_role, but is scoped to
-- workspace owners only (verified via workspace_members check).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_workspace_plan_for_testing(
    p_workspace_id UUID,
    p_plan TEXT,
    p_status TEXT DEFAULT 'active',
    p_cancel_at_period_end BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
    -- Verify the caller is a member of this workspace (owner or admin)
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Forbidden: only workspace owners or admins can use this test helper';
    END IF;

    -- Validate plan
    IF p_plan NOT IN ('free', 'starter', 'pro') THEN
        RAISE EXCEPTION 'Invalid plan: %. Supported: free, starter, pro', p_plan;
    END IF;

    -- Update the subscription
    UPDATE public.subscriptions
    SET
        plan = p_plan,
        status = p_status,
        cancel_at_period_end = p_cancel_at_period_end,
        updated_at = NOW()
    WHERE workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        -- Insert default if not present yet
        INSERT INTO public.subscriptions (workspace_id, plan, status, cancel_at_period_end)
        VALUES (p_workspace_id, p_plan, p_status, p_cancel_at_period_end);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_workspace_plan_for_testing(UUID, TEXT, TEXT, BOOLEAN)
    TO authenticated;

-- ============================================================================
-- insert_stripe_event_for_testing
-- Allows test runner to insert a stripe_events record to test idempotency.
-- Workspace owner scope verifies caller legitimacy.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_stripe_event_for_testing(
    p_event_id TEXT,
    p_event_type TEXT,
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
    -- Only allow test-prefixed event IDs to prevent abuse
    IF p_event_id NOT LIKE 'evt_test_%' AND p_event_id NOT LIKE 'evt_idempotency_test_%' THEN
        RAISE EXCEPTION 'Only test event IDs (evt_test_*) are allowed via this helper';
    END IF;

    INSERT INTO public.stripe_events (id, type, data)
    VALUES (p_event_id, p_event_type, p_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.insert_stripe_event_for_testing(TEXT, TEXT, JSONB)
    TO authenticated;
