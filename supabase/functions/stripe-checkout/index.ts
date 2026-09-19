// Supabase Edge Function: stripe-checkout
// Creates a Stripe Checkout Session in TEST MODE for Starter or Pro subscription
// Strictly verifies Supabase authentication, workspace ownership, and server-side pricing.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_PLANS = ['starter', 'pro'] as const;
type AllowedPlan = (typeof ALLOWED_PLANS)[number];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    // 1. Authenticate user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: invalid token format.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuthClient = createClient(supabaseUrl || '', anonKey || '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: invalid or expired session token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse and validate input body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Validation error: invalid JSON body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { workspaceId, plan, successUrl, cancelUrl } = body || {};

    if (!workspaceId || typeof workspaceId !== 'string' || !UUID_REGEX.test(workspaceId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Validation error: valid workspaceId UUID is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan || !ALLOWED_PLANS.includes(plan as AllowedPlan)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Validation error: invalid plan '${plan}'. Supported upgrade plans are: 'starter', 'pro'.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Explicit rejection of frontend-supplied prices/amounts
    if (body.price !== undefined || body.amount !== undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Security error: client-supplied price or amount is forbidden. Prices are enforced server-side.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Authorization Check: verify caller is workspace owner/admin
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Internal configuration error: missing service key.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey);
    const { data: membership, error: memError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden: only workspace owners or admins can manage subscription billing.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch workspace details
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single();

    // 4. Verify server-side Stripe secret key
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          error: 'STRIPE_SECRET_KEY is not configured in server environment secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Find or Create Stripe Customer
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    let stripeCustomerId = existingSub?.stripe_customer_id;

    if (!stripeCustomerId) {
      const createCustomerParams = new URLSearchParams();
      createCustomerParams.append('email', user.email || '');
      createCustomerParams.append('name', workspace?.name || 'DocChase Workspace');
      createCustomerParams.append('metadata[workspace_id]', workspaceId);
      createCustomerParams.append('metadata[user_id]', user.id);

      const custRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: createCustomerParams.toString(),
      });

      if (!custRes.ok) {
        const custErr = await custRes.text();
        return new Response(
          JSON.stringify({ success: false, error: `Stripe customer creation failed: ${custErr}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const custData = await custRes.json();
      stripeCustomerId = custData.id;

      // Update subscription record with stripe_customer_id
      await supabaseAdmin
        .from('subscriptions')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('workspace_id', workspaceId);
    }

    // 6. Resolve trusted Server-Side Stripe Price ID
    let priceId = plan === 'starter'
      ? Deno.env.get('STRIPE_PRICE_ID_STARTER')
      : Deno.env.get('STRIPE_PRICE_ID_PRO');

    // If specific price ID not in env, lookup or create standard Test Mode price
    if (!priceId) {
      const planAmount = plan === 'starter' ? 900 : 1900; // $9.00 or $19.00
      const planName = plan === 'starter' ? 'DocChase Starter' : 'DocChase Pro';

      // Find or create product
      const prodSearchRes = await fetch(
        `https://api.stripe.com/v1/products?limit=10&active=true`,
        {
          headers: { Authorization: `Bearer ${stripeSecretKey}` },
        }
      );

      let productId: string | null = null;
      if (prodSearchRes.ok) {
        const prods = await prodSearchRes.json();
        const found = prods.data?.find((p: any) => p.name === planName);
        if (found) productId = found.id;
      }

      if (!productId) {
        const createProdParams = new URLSearchParams();
        createProdParams.append('name', planName);
        createProdParams.append('description', `${planName} Subscription Plan for DocChase`);
        createProdParams.append('metadata[plan]', plan);

        const createProdRes = await fetch('https://api.stripe.com/v1/products', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: createProdParams.toString(),
        });

        if (createProdRes.ok) {
          const prodData = await createProdRes.json();
          productId = prodData.id;
        }
      }

      // Find or create price for product
      if (productId) {
        const priceSearchRes = await fetch(
          `https://api.stripe.com/v1/prices?product=${productId}&active=true&currency=usd&type=recurring`,
          {
            headers: { Authorization: `Bearer ${stripeSecretKey}` },
          }
        );

        if (priceSearchRes.ok) {
          const prices = await priceSearchRes.json();
          const match = prices.data?.find(
            (p: any) => p.unit_amount === planAmount && p.recurring?.interval === 'month'
          );
          if (match) priceId = match.id;
        }

        if (!priceId) {
          const createPriceParams = new URLSearchParams();
          createPriceParams.append('product', productId);
          createPriceParams.append('unit_amount', planAmount.toString());
          createPriceParams.append('currency', 'usd');
          createPriceParams.append('recurring[interval]', 'month');
          createPriceParams.append('metadata[plan]', plan);

          const createPriceRes = await fetch('https://api.stripe.com/v1/prices', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: createPriceParams.toString(),
          });

          if (createPriceRes.ok) {
            const priceData = await createPriceRes.json();
            priceId = priceData.id;
          }
        }
      }
    }

    if (!priceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Could not resolve or create Stripe Price ID for plan '${plan}'.`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Create Stripe Checkout Session (Test Mode)
    const appBaseUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const finalSuccessUrl = successUrl || `${appBaseUrl}/accountant/billing?session_id={CHECKOUT_SESSION_ID}&success=true`;
    const finalCancelUrl = cancelUrl || `${appBaseUrl}/accountant/billing?canceled=true`;

    const sessionParams = new URLSearchParams();
    sessionParams.append('mode', 'subscription');
    sessionParams.append('customer', stripeCustomerId);
    sessionParams.append('line_items[0][price]', priceId);
    sessionParams.append('line_items[0][quantity]', '1');
    sessionParams.append('success_url', finalSuccessUrl);
    sessionParams.append('cancel_url', finalCancelUrl);
    sessionParams.append('metadata[workspace_id]', workspaceId);
    sessionParams.append('metadata[plan]', plan);
    sessionParams.append('subscription_data[metadata][workspace_id]', workspaceId);
    sessionParams.append('subscription_data[metadata][plan]', plan);

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionParams.toString(),
    });

    if (!sessionRes.ok) {
      const sessionErr = await sessionRes.text();
      return new Response(
        JSON.stringify({ success: false, error: `Stripe Checkout Session creation failed: ${sessionErr}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionData = await sessionRes.json();

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: sessionData.id,
        url: sessionData.url,
        plan,
        priceId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
