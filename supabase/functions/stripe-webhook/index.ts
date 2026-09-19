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

    // 6. Handle Supported Stripe Events
    const eventType: string = event.type;
    const obj = event.data?.object;

    if (eventType === 'checkout.session.completed') {
      const workspaceId = obj.metadata?.workspace_id;
      const plan = obj.metadata?.plan || 'starter';
      const customerId = obj.customer;
      const subscriptionId = obj.subscription;

      if (workspaceId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            stripe_customer_id: customerId || null,
            stripe_subscription_id: subscriptionId || null,
            plan: ['starter', 'pro'].includes(plan) ? plan : 'starter',
            status: 'active',
            cancel_at_period_end: false,
          })
          .eq('workspace_id', workspaceId);
      }
    } else if (
      eventType === 'customer.subscription.created' ||
      eventType === 'customer.subscription.updated'
    ) {
      const subscriptionId = obj.id;
      const customerId = obj.customer;
      const status = obj.status; // active, past_due, unpaid, canceled, trialing, etc.
      const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
      const periodStart = obj.current_period_start
        ? new Date(obj.current_period_start * 1000).toISOString()
        : null;
      const periodEnd = obj.current_period_end
        ? new Date(obj.current_period_end * 1000).toISOString()
        : null;
      const priceId = obj.items?.data?.[0]?.price?.id;
      const unitAmount = obj.items?.data?.[0]?.price?.unit_amount;

      // Determine plan from metadata, price ID or amount
      let plan: 'starter' | 'pro' = 'starter';
      if (obj.metadata?.plan === 'pro' || unitAmount === 1900) {
        plan = 'pro';
      } else if (obj.metadata?.plan === 'starter' || unitAmount === 900) {
        plan = 'starter';
      }

      const updateData: any = {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: status || 'active',
        cancel_at_period_end: cancelAtPeriodEnd,
        current_period_start: periodStart,
        current_period_end: periodEnd,
      };

      if (priceId) updateData.stripe_price_id = priceId;
      if (status === 'active' || status === 'trialing') {
        updateData.plan = plan;
      }

      // Try matching by workspace_id metadata first
      let matched = false;
      const workspaceId = obj.metadata?.workspace_id;
      if (workspaceId) {
        const { data: updated } = await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('workspace_id', workspaceId)
          .select('id');
        if (updated && updated.length > 0) matched = true;
      }

      // If not matched, try matching by stripe_subscription_id
      if (!matched && subscriptionId) {
        const { data: updated } = await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscriptionId)
          .select('id');
        if (updated && updated.length > 0) matched = true;
      }

      // If not matched, try matching by stripe_customer_id
      if (!matched && customerId) {
        await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_customer_id', customerId);
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const subscriptionId = obj.id;
      const customerId = obj.customer;

      if (subscriptionId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
          })
          .eq('stripe_subscription_id', subscriptionId);
      } else if (customerId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
          })
          .eq('stripe_customer_id', customerId);
      }
    } else if (eventType === 'invoice.payment_failed') {
      const subscriptionId = obj.subscription;
      if (subscriptionId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);
      }
    }

    return new Response(
      JSON.stringify({ received: true, eventId: event.id, type: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
