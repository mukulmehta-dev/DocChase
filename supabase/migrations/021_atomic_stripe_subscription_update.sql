-- ============================================================================
-- Migration 021: Concurrency-Safe Atomic Stripe Subscription Updates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_stripe_subscription_update(
    p_workspace_id UUID DEFAULT NULL,
    p_stripe_customer_id TEXT DEFAULT NULL,
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_plan TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_stripe_price_id TEXT DEFAULT NULL,
    p_cancel_at_period_end BOOLEAN DEFAULT NULL,
    p_current_period_start TIMESTAMPTZ DEFAULT NULL,
    p_current_period_end TIMESTAMPTZ DEFAULT NULL,
    p_event_created BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
    v_target_workspace_id UUID := p_workspace_id;
BEGIN
    -- 1. If p_workspace_id is not supplied, look up workspace by subscription or customer ID
    IF v_target_workspace_id IS NULL THEN
        IF p_stripe_subscription_id IS NOT NULL THEN
            SELECT workspace_id INTO v_target_workspace_id
            FROM public.subscriptions
            WHERE stripe_subscription_id = p_stripe_subscription_id
            LIMIT 1;
        END IF;

        IF v_target_workspace_id IS NULL AND p_stripe_customer_id IS NOT NULL THEN
            SELECT workspace_id INTO v_target_workspace_id
            FROM public.subscriptions
            WHERE stripe_customer_id = p_stripe_customer_id
            LIMIT 1;
        END IF;
    END IF;

    IF v_target_workspace_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Subscription record not found for the provided workspace, subscription, or customer identifier.'
        );
    END IF;

    -- 2. Concurrency Guard: Lock the subscription row FOR UPDATE to strictly serialize updates
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE workspace_id = v_target_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- If subscription row doesn't exist yet, insert a new record
        INSERT INTO public.subscriptions (
            workspace_id,
            stripe_customer_id,
            stripe_subscription_id,
            plan,
            status,
            stripe_price_id,
            cancel_at_period_end,
            current_period_start,
            current_period_end,
            stripe_event_created
        )
        VALUES (
            v_target_workspace_id,
            p_stripe_customer_id,
            p_stripe_subscription_id,
            COALESCE(p_plan, 'free'),
            COALESCE(p_status, 'active'),
            p_stripe_price_id,
            COALESCE(p_cancel_at_period_end, false),
            p_current_period_start,
            p_current_period_end,
            p_event_created
        );

        RETURN jsonb_build_object(
            'success', true,
            'applied', true,
            'ignored_older_event', false,
            'workspace_id', v_target_workspace_id,
            'new_timestamp', p_event_created
        );
    END IF;

    -- 3. Atomic Ordering Guard:
    -- Accept when incoming p_event_created >= stored stripe_event_created.
    -- If incoming event timestamp is strictly older, ignore mutation safely without error.
    IF p_event_created IS NOT NULL AND v_sub.stripe_event_created IS NOT NULL AND p_event_created < v_sub.stripe_event_created THEN
        RETURN jsonb_build_object(
            'success', true,
            'applied', false,
            'ignored_older_event', true,
            'workspace_id', v_target_workspace_id,
            'stored_timestamp', v_sub.stripe_event_created,
            'incoming_timestamp', p_event_created
        );
    END IF;

    -- 4. Apply subscription update and timestamp atomically
    UPDATE public.subscriptions
    SET 
        stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
        stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
        plan = CASE 
            WHEN p_plan IS NOT NULL AND p_status IN ('active', 'trialing') THEN p_plan
            WHEN p_status IN ('canceled', 'incomplete_expired', 'unpaid') THEN 'free'
            ELSE COALESCE(p_plan, plan)
        END,
        status = COALESCE(p_status, status),
        stripe_price_id = COALESCE(p_stripe_price_id, stripe_price_id),
        cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end),
        current_period_start = COALESCE(p_current_period_start, current_period_start),
        current_period_end = COALESCE(p_current_period_end, current_period_end),
        stripe_event_created = GREATEST(COALESCE(p_event_created, 0), COALESCE(v_sub.stripe_event_created, 0)),
        updated_at = NOW()
    WHERE workspace_id = v_target_workspace_id;

    RETURN jsonb_build_object(
        'success', true,
        'applied', true,
        'ignored_older_event', false,
        'workspace_id', v_target_workspace_id,
        'new_timestamp', GREATEST(COALESCE(p_event_created, 0), COALESCE(v_sub.stripe_event_created, 0))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_update TO service_role;

-- Test helper version scoped to workspace owners for integration tests
CREATE OR REPLACE FUNCTION public.apply_stripe_subscription_update_for_testing(
    p_workspace_id UUID,
    p_stripe_customer_id TEXT DEFAULT NULL,
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_plan TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_stripe_price_id TEXT DEFAULT NULL,
    p_cancel_at_period_end BOOLEAN DEFAULT NULL,
    p_current_period_start TIMESTAMPTZ DEFAULT NULL,
    p_current_period_end TIMESTAMPTZ DEFAULT NULL,
    p_event_created BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is workspace owner or admin
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Forbidden: only workspace owners or admins can use this test helper';
    END IF;

    RETURN public.apply_stripe_subscription_update(
        p_workspace_id => p_workspace_id,
        p_stripe_customer_id => p_stripe_customer_id,
        p_stripe_subscription_id => p_stripe_subscription_id,
        p_plan => p_plan,
        p_status => p_status,
        p_stripe_price_id => p_stripe_price_id,
        p_cancel_at_period_end => p_cancel_at_period_end,
        p_current_period_start => p_current_period_start,
        p_current_period_end => p_current_period_end,
        p_event_created => p_event_created
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_update_for_testing TO authenticated;
