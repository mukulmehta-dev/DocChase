// Supabase Edge Function: stripe-webhook
// Secure, idempotent processing of Stripe webhook events in TEST MODE.
// Verifies cryptographic Stripe signatures and synchronizes subscription state.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Cryptographic Stripe Signature Verification using Web Crypto API
async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300 // 5 minutes
): Promise<{ valid: boolean; error?: string }> {
  try {
    const parts = sigHeader.split(',');
    let timestampStr = '';
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, val] = part.split('=');
      if (key === 't') {
        timestampStr = val;
      } else if (key === 'v1') {
        signatures.push(val);
      }
    }

    if (!timestampStr || signatures.length === 0) {
      return { valid: false, error: 'Malformed stripe-signature header: missing timestamp or v1 signature.' };
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return { valid: false, error: 'Malformed stripe-signature header: invalid timestamp.' };
    }

    // Check tolerance (allow up to toleranceSeconds difference)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return { valid: false, error: `Signature timestamp expired (difference: ${Math.abs(now - timestamp)}s).` };
    }

    // Construct the signed payload: `${timestamp}.${rawBody}`
    const signedPayload = `${timestampStr}.${rawBody}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const payloadData = encoder.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedHex = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Constant-time comparison against any matching v1 signature
    const isValid = signatures.some((sig) => {
      if (sig.length !== expectedHex.length) return false;
      let diff = 0;
      for (let i = 0; i < sig.length; i++) {
        diff |= sig.charCodeAt(i) ^ expectedHex.charCodeAt(i);
      }
      return diff === 0;
    });

    if (!isValid) {
      return { valid: false, error: 'Signature mismatch.' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Signature verification failed: ${err.message}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    // 1. Verify webhook secret configuration
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          error: 'STRIPE_WEBHOOK_SECRET is not configured in server environment secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Read raw body and Stripe-Signature header
    const rawBody = await req.text();
    const sigHeader = req.headers.get('stripe-signature');

    if (!sigHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing stripe-signature header.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cryptographic Verification of Stripe Signature
    const { valid, error: sigError } = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    if (!valid) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid Stripe signature: ${sigError}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse verified Stripe event
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!event || !event.id || !event.type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Stripe event structure.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Database-Backed Webhook Idempotency Check
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Internal server configuration error.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey);

    // Check if event has already been processed
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle();

    if (existingEvent) {
      // Event was already processed idempotently
      return new Response(
        JSON.stringify({ received: true, idempotent: true, eventId: event.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the event in stripe_events table
    const { error: insertErr } = await supabaseAdmin.from('stripe_events').insert({
      id: event.id,
      type: event.type,
      data: event,
    });

    if (insertErr && insertErr.code === '23505') {
      // Unique constraint violation (race condition handled)
      return new Response(
        JSON.stringify({ received: true, idempotent: true, eventId: event.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Handle Supported Stripe Events with Atomic Event-Ordering Guard
    const eventType: string = event.type;
    const obj = event.data?.object;
    const eventCreated: number | null = typeof event.created === 'number' ? event.created : null;

    if (eventType === 'checkout.session.completed') {
      const workspaceId = obj.metadata?.workspace_id || null;
      const plan = obj.metadata?.plan || 'starter';
      const customerId = obj.customer || null;
      const subscriptionId = obj.subscription || null;
      const validPlan = ['starter', 'pro'].includes(plan) ? plan : 'starter';

      const { data: updateResult, error: rpcErr } = await supabaseAdmin.rpc(
        'apply_stripe_subscription_update',
        {
          p_workspace_id: workspaceId,
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscriptionId,
          p_plan: validPlan,
          p_status: 'active',
          p_stripe_price_id: null,
          p_cancel_at_period_end: false,
          p_current_period_start: null,
          p_current_period_end: null,
          p_event_created: eventCreated,
        }
      );

      if (rpcErr) {
        console.error('Error applying checkout.session.completed update:', rpcErr);
      }

      if (updateResult?.ignored_older_event) {
        return new Response(
          JSON.stringify({ received: true, ignored_older_event: true, eventId: event.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (
      eventType === 'customer.subscription.created' ||
      eventType === 'customer.subscription.updated'
    ) {
      const subscriptionId = obj.id || null;
      const customerId = obj.customer || null;
      const status = obj.status || 'active'; // active, past_due, unpaid, canceled, trialing, etc.
      const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
      const periodStart = obj.current_period_start
        ? new Date(obj.current_period_start * 1000).toISOString()
        : null;
      const periodEnd = obj.current_period_end
        ? new Date(obj.current_period_end * 1000).toISOString()
        : null;
      const priceId = obj.items?.data?.[0]?.price?.id || null;
      const unitAmount = obj.items?.data?.[0]?.price?.unit_amount;
      const workspaceId = obj.metadata?.workspace_id || null;

      // Determine plan from metadata, price ID or amount
      let plan: 'starter' | 'pro' | null = null;
      if (obj.metadata?.plan === 'pro' || unitAmount === 1900) {
        plan = 'pro';
      } else if (obj.metadata?.plan === 'starter' || unitAmount === 900) {
        plan = 'starter';
      }

      const { data: updateResult, error: rpcErr } = await supabaseAdmin.rpc(
        'apply_stripe_subscription_update',
        {
          p_workspace_id: workspaceId,
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscriptionId,
          p_plan: plan,
          p_status: status,
          p_stripe_price_id: priceId,
          p_cancel_at_period_end: cancelAtPeriodEnd,
          p_current_period_start: periodStart,
          p_current_period_end: periodEnd,
          p_event_created: eventCreated,
        }
      );

      if (rpcErr) {
        console.error('Error applying subscription update:', rpcErr);
      }

      if (updateResult?.ignored_older_event) {
        return new Response(
          JSON.stringify({ received: true, ignored_older_event: true, eventId: event.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const subscriptionId = obj.id || null;
      const customerId = obj.customer || null;
      const workspaceId = obj.metadata?.workspace_id || null;

      const { data: updateResult, error: rpcErr } = await supabaseAdmin.rpc(
        'apply_stripe_subscription_update',
        {
          p_workspace_id: workspaceId,
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscriptionId,
          p_plan: 'free',
          p_status: 'canceled',
          p_stripe_price_id: null,
          p_cancel_at_period_end: true,
          p_current_period_start: null,
          p_current_period_end: null,
          p_event_created: eventCreated,
        }
      );

      if (rpcErr) {
        console.error('Error applying subscription.deleted update:', rpcErr);
      }

      if (updateResult?.ignored_older_event) {
        return new Response(
          JSON.stringify({ received: true, ignored_older_event: true, eventId: event.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (eventType === 'invoice.payment_failed') {
      const subscriptionId = obj.subscription || null;
      const customerId = obj.customer || null;

      const { data: updateResult, error: rpcErr } = await supabaseAdmin.rpc(
        'apply_stripe_subscription_update',
        {
          p_workspace_id: null,
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscriptionId,
          p_plan: null,
          p_status: 'past_due',
          p_stripe_price_id: null,
          p_cancel_at_period_end: null,
          p_current_period_start: null,
          p_current_period_end: null,
          p_event_created: eventCreated,
        }
      );

      if (rpcErr) {
        console.error('Error applying invoice.payment_failed update:', rpcErr);
      }

      if (updateResult?.ignored_older_event) {
        return new Response(
          JSON.stringify({ received: true, ignored_older_event: true, eventId: event.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ received: true, applied: true, eventId: event.id, type: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
