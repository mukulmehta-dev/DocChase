// Supabase Edge Function: send-reminders
// Implements automated recurring reminder worker with atomic claiming and concurrency protection

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimedReminderRow {
  reminder_id: string;
  workspace_id: string;
  request_id: string;
  scheduled_for: string;
  reminder_type: string;
  request_title: string;
  request_period: string;
  request_due_date: string;
  request_status: string;
  access_token: string | null;
  client_name: string;
  client_email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'https://docchase.app';
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Authenticate caller
    // Allowed callers:
    // - Service Role key
    // - Configured CRON_SECRET
    // - User-Agent matching 'DocChase-Cron/1.0' (from pg_cron)
    // - Valid accountant JWT session
    const authHeader = req.headers.get('Authorization') || '';
    const userAgent = req.headers.get('User-Agent') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    const isServiceRole = (token === serviceRoleKey);
    const isCronSecret = Boolean(cronSecret && token === cronSecret);
    const isPgCron = (userAgent === 'DocChase-Cron/1.0');

    let isAuthorized = isServiceRole || isCronSecret || isPgCron;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!isAuthorized && token) {
      // Check if caller is an authenticated user
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: invalid or missing authorization credentials.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Recover any stale processing claims (from previously crashed workers)
    const { data: recoveredCount } = await supabase.rpc('reset_stale_processing_reminders', {
      p_timeout_minutes: 15,
    });

    // 3. Atomically claim due reminders using FOR UPDATE SKIP LOCKED
    const { data: claimedRows, error: claimError } = await supabase.rpc('claim_due_reminders', {
      p_limit: 25,
    });

    if (claimError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to claim due reminders: ${claimError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reminders: ClaimedReminderRow[] = (claimedRows as any) || [];

    if (reminders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          recovered: recoveredCount || 0,
          message: 'No eligible reminders due for dispatch at this time.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: Array<{ reminder_id: string; error: string }> = [];

    // 4. Process each claimed reminder
    for (const r of reminders) {
      try {
        // Double-check: Stop rule 1: Request is already READY or CANCELLED
        if (r.request_status === 'ready') {
          await supabase
            .from('reminders')
            .update({ status: 'skipped', updated_at: new Date().toISOString() })
            .eq('id', r.reminder_id);
          skippedCount++;
          continue;
        }

        if (r.request_status === 'cancelled') {
          await supabase
            .from('reminders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', r.reminder_id);
          skippedCount++;
          continue;
        }

        // Query request items to check outstanding required items
        const { data: items } = await supabase
          .from('request_items')
          .select('id, name, required, status')
          .eq('request_id', r.request_id);

        const allItems = items || [];
        const outstandingRequired = allItems.filter(
          (i) => i.required && (i.status === 'missing' || i.status === 'rejected')
        );

        // Stop rule 2: Zero outstanding required items
        if (outstandingRequired.length === 0) {
          await supabase
            .from('reminders')
            .update({ status: 'skipped', updated_at: new Date().toISOString() })
            .eq('id', r.reminder_id);
          skippedCount++;
          continue;
        }

        // Stop rule 3: Missing client email
        if (!r.client_email) {
          await supabase
            .from('reminders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', r.reminder_id);
          failedCount++;
          errors.push({ reminder_id: r.reminder_id, error: 'Client has no email address configured' });
          continue;
        }

        // Construct portal URL using request's access_token
        const portalUrl = r.access_token ? `${appUrl}/request/${r.access_token}` : '';

        // Invoke existing send-email Edge Function with service-role credentials
        const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: r.workspace_id,
            request_id: r.request_id,
            type: 'reminder',
            client_portal_url: portalUrl,
          }),
        });

        const emailJson = await emailRes.json();

        if (emailRes.ok && emailJson.success) {
          // Resend delivery confirmed!
          const now = new Date().toISOString();
          await supabase
            .from('reminders')
            .update({
              status: 'sent',
              sent_at: now,
              updated_at: now,
            })
            .eq('id', r.reminder_id);

          // Schedule next recurring reminder (in 3 days)
          const nextDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('reminders').insert({
            workspace_id: r.workspace_id,
            request_id: r.request_id,
            scheduled_for: nextDate,
            reminder_type: 'email',
            status: 'scheduled',
          });

          sentCount++;
        } else if (emailJson.stopped) {
          // Stopped by business rule in send-email
          await supabase
            .from('reminders')
            .update({ status: 'skipped', updated_at: new Date().toISOString() })
            .eq('id', r.reminder_id);
          skippedCount++;
        } else {
          // Delivery failed or RESEND_API_KEY unconfigured (503)
          // Honestly record as 'failed' — do not fake success and do not schedule next reminder
          await supabase
            .from('reminders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', r.reminder_id);
          failedCount++;
          errors.push({
            reminder_id: r.reminder_id,
            error: emailJson.error || 'Resend delivery failed or unconfigured',
          });
        }
      } catch (itemErr: any) {
        // Individual reminder processing error
        await supabase
          .from('reminders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', r.reminder_id);
        failedCount++;
        errors.push({ reminder_id: r.reminder_id, error: itemErr.message || 'Processing exception' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: reminders.length,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
        recovered: recoveredCount || 0,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error in reminder worker' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
