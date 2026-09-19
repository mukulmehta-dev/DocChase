// Supabase Edge Function: send-email
// Implements server-side transactional email dispatch via Resend REST API

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  workspace_id: string;
  request_id: string;
  type: 'initial_request' | 'reminder' | 'document_rejected';
  client_portal_url?: string;
  request_item_id?: string;
  rejection_reason?: string;
}

// Generates accessible, responsive HTML email template
function generateEmailContent(params: {
  type: 'initial_request' | 'reminder' | 'document_rejected';
  clientName: string;
  workspaceName: string;
  requestTitle: string;
  period: string;
  dueDate: string;
  portalUrl: string;
  items?: Array<{ name: string; required?: boolean; status?: string }>;
  rejectedItemName?: string;
  rejectionReason?: string;
}): { subject: string; html: string; text: string } {
  const {
    type,
    clientName,
    workspaceName,
    requestTitle,
    period,
    dueDate,
    portalUrl,
    items = [],
    rejectedItemName,
    rejectionReason,
  } = params;

  let subject = '';
  let headline = '';
  let intro = '';
  let ctaText = 'Open Secure Client Portal';
  let detailsHtml = '';
  let detailsText = '';

  if (type === 'initial_request') {
    subject = `Document Request: ${requestTitle} — ${workspaceName}`;
    headline = 'Action Required: Document Request';
    intro = `${workspaceName} has requested documents for <strong>${requestTitle}</strong> (${period}). Please review the requested checklist and securely upload your files by <strong>${dueDate}</strong>.`;
    ctaText = 'Upload Requested Documents';

    if (items.length > 0) {
      detailsHtml = `
        <div style="margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #334155; text-transform: uppercase; letter-spacing: 0.05em;">Requested Checklist (${items.length} item${items.length === 1 ? '' : 's'}):</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
            ${items
              .map(
                (item) =>
                  `<li><strong>${item.name}</strong> ${item.required ? '<span style="color: #dc2626; font-size: 11px;">(Required)</span>' : '<span style="color: #64748b; font-size: 11px;">(Optional)</span>'}</li>`
              )
              .join('')}
          </ul>
        </div>
      `;
      detailsText = `\nRequested Checklist:\n${items.map((i) => `- ${i.name} (${i.required ? 'Required' : 'Optional'})`).join('\n')}\n`;
    }
  } else if (type === 'reminder') {
    subject = `Reminder: ${requestTitle} — Documents Outstanding`;
    headline = 'Reminder: Pending Document Request';
    intro = `This is a reminder from ${workspaceName} regarding <strong>${requestTitle}</strong>. The deadline for submission is <strong>${dueDate}</strong>.`;
    ctaText = 'Review & Upload Documents';

    if (items.length > 0) {
      detailsHtml = `
        <div style="margin: 20px 0; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em;">Outstanding Documents (${items.length}):</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #78350f; line-height: 1.6;">
            ${items.map((item) => `<li><strong>${item.name}</strong></li>`).join('')}
          </ul>
        </div>
      `;
      detailsText = `\nOutstanding Documents:\n${items.map((i) => `- ${i.name}`).join('\n')}\n`;
    }
  } else if (type === 'document_rejected') {
    subject = `Document Replacement Needed: ${rejectedItemName || 'Document'} — ${requestTitle}`;
    headline = 'Document Replacement Requested';
    intro = `During review of your documents for <strong>${requestTitle}</strong>, ${workspaceName} noted an issue with one of your submissions that requires correction:`;
    ctaText = 'Upload Replacement Document';

    detailsHtml = `
      <div style="margin: 20px 0; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;">Declined Document: ${rejectedItemName}</p>
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.05em;">Accountant Feedback / Reason:</p>
        <blockquote style="margin: 0; padding: 8px 12px; background: #ffffff; border-left: 3px solid #ef4444; font-size: 13px; color: #4b5563; font-style: italic;">
          "${rejectionReason || 'Please provide a clear and complete replacement copy.'}"
        </blockquote>
      </div>
    `;
    detailsText = `\nDeclined Document: ${rejectedItemName}\nReason: ${rejectionReason || 'Please provide a replacement copy.'}\n`;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 30px 15px; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 24px 32px; background: #0f172a; border-bottom: 2px solid #0284c7;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">Doc<span style="color: #38bdf8;">Chase</span></span>
            </td>
            <td align="right">
              <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">${workspaceName}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding: 32px 32px 24px 32px;">
        <h1 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">${headline}</h1>
        <p style="font-size: 15px; line-height: 1.5; color: #334155; margin: 0 0 16px 0;">Hi ${clientName},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">${intro}</p>
        
        ${detailsHtml}

        <!-- Call to Action -->
        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="${portalUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);">
            ${ctaText} &rarr;
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <strong>No login required:</strong> You do not need to create an account or password. Simply click the button above to access your private, end-to-end encrypted upload portal.
        </p>
        <p style="font-size: 11px; color: #94a3b8; word-break: break-all; margin: 8px 0 0 0;">
          Direct link: <a href="${portalUrl}" style="color: #0284c7; text-decoration: underline;">${portalUrl}</a>
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        Sent on behalf of <strong>${workspaceName}</strong> via DocChase Automated Document Intelligence.<br>
        If you have questions about this request, please reply directly or contact your accountant.
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
DocChase — ${workspaceName}
${headline}

Hi ${clientName},

${intro.replace(/<[^>]+>/g, '')}
${detailsText}

Access your private client portal here:
${portalUrl}

No login or password required. Your link provides direct encrypted access to upload your files.

Sent on behalf of ${workspaceName} via DocChase.
  `.trim();

  return { subject, html, text };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'DocChase <onboarding@resend.dev>';
    const appUrl = Deno.env.get('APP_URL') || 'https://docchase.app';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Authenticate caller using JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = (token === serviceRoleKey);
    let userId: string | null = null;

    // 2. Parse payload
    const body: EmailPayload = await req.json();
    const { workspace_id, request_id, type, client_portal_url, request_item_id, rejection_reason } = body;

    if (!workspace_id || !request_id || !type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters (workspace_id, request_id, type).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isServiceRole) {
      // Internal service-role caller (e.g. automated reminder worker)
      // Look up workspace owner for notifications/audit attribution
      const { data: ownerMember } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspace_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      userId = ownerMember?.user_id || null;
    } else {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: invalid or expired session token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = userData.user.id;
    }

    // 3. Verify workspace authorization (for non-service-role callers)
    if (!isServiceRole) {
      const { data: member, error: memberErr } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace_id)
        .eq('user_id', userId!)
        .single();

      if (memberErr || !member) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: you are not a member of this workspace.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Fetch and validate request and client details
    const { data: request, error: reqErr } = await supabase
      .from('requests')
      .select(`
        id,
        workspace_id,
        client_id,
        title,
        period,
        due_date,
        status,
        access_token,
        client:clients(id, name, email, company_name),
        workspace:workspaces(id, name)
      `)
      .eq('id', request_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (reqErr || !request || !request.client) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request or associated client not found in this workspace.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientData: any = request.client;
    const workspaceData: any = request.workspace;
    const clientEmail = clientData.email;
    const clientName = clientData.company_name || clientData.name || 'Client';
    const workspaceName = workspaceData?.name || 'Your Accountant';

    if (!clientEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client does not have an email address configured.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Respect cancelled requests
    if (request.status === 'cancelled') {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot send email for a cancelled request.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Fetch request items for context
    const { data: itemsData } = await supabase
      .from('request_items')
      .select('id, name, required, status, rejection_reason')
      .eq('request_id', request_id);

    const items = itemsData || [];
    const outstandingItems = items.filter((i) => i.status === 'missing' || i.status === 'rejected');

    // 6. Enforce Reminder Stop Rules
    if (type === 'reminder') {
      if (request.status === 'ready') {
        return new Response(
          JSON.stringify({
            success: false,
            stopped: true,
            error: 'Request is already READY (all required documents approved). Reminders are halted.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (outstandingItems.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            stopped: true,
            message: 'All documents have been approved or provided. Reminder skipped.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 7. Resolve client portal URL
    const rawToken = request.access_token;
    const portalUrl = client_portal_url || (rawToken ? `${appUrl}/request/${rawToken}` : '');

    if (!portalUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to construct client portal URL: missing request token.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve rejection item name if type is document_rejected
    let rejectedItemName = '';
    if (type === 'document_rejected' && request_item_id) {
      const foundItem = items.find((i) => i.id === request_item_id);
      rejectedItemName = foundItem?.name || 'Document';
    }

    // 8. Check RESEND_API_KEY
    if (!resendApiKey) {
      const missingSecretMsg =
        'RESEND_API_KEY is not configured in Supabase secrets. Please configure it with: npx supabase secrets set RESEND_API_KEY=re_...';

      // Record failure in reminders table if type is reminder
      if (type === 'reminder') {
        await supabase.from('reminders').insert({
          workspace_id,
          request_id,
          scheduled_for: new Date().toISOString(),
          reminder_type: 'email',
          status: 'failed',
        });
      }

      // Record audit log
      await supabase.from('audit_logs').insert({
        workspace_id,
        action: 'email.failed',
        entity_type: 'request',
        entity_id: request_id,
        metadata: {
          type,
          client_email: clientEmail,
          error: 'RESEND_API_KEY secret missing',
        },
      });

      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          error: missingSecretMsg,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Generate email content
    const emailContent = generateEmailContent({
      type,
      clientName,
      workspaceName,
      requestTitle: request.title,
      period: request.period,
      dueDate: request.due_date,
      portalUrl,
      items: type === 'reminder' ? outstandingItems : items,
      rejectedItemName,
      rejectionReason: rejection_reason,
    });

    // 10. Dispatch email via Resend REST API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [clientEmail],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    });

    const resendJson = await resendRes.json();

    if (!resendRes.ok) {
      const errMessage = resendJson.message || resendJson.name || 'Resend delivery failed';

      // Record failed reminder
      if (type === 'reminder') {
        await supabase.from('reminders').insert({
          workspace_id,
          request_id,
          scheduled_for: new Date().toISOString(),
          reminder_type: 'email',
          status: 'failed',
        });
      }

      // Log failure in audit
      await supabase.from('audit_logs').insert({
        workspace_id,
        action: 'email.failed',
        entity_type: 'request',
        entity_id: request_id,
        metadata: {
          type,
          client_email: clientEmail,
          error: errMessage,
        },
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Resend API Error: ${errMessage}`,
          details: resendJson,
        }),
        { status: resendRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 11. Record successful dispatch
    const now = new Date().toISOString();

    if (type === 'reminder') {
      await supabase.from('reminders').insert({
        workspace_id,
        request_id,
        scheduled_for: now,
        reminder_type: 'email',
        status: 'sent',
        sent_at: now,
      });
    } else if (type === 'initial_request') {
      await supabase
        .from('requests')
        .update({ sent_at: now })
        .eq('id', request_id);
    }

    // Record in-app notification for accountant
    await supabase.from('notifications').insert({
      workspace_id,
      user_id: userId,
      type: `email.${type}`,
      title: type === 'reminder' ? 'Reminder Email Sent' : type === 'document_rejected' ? 'Rejection Notice Sent' : 'Request Email Sent',
      message: `Delivered to ${clientEmail} for "${request.title}"`,
    });

    // Record audit event (Notice: Never log raw tokens or Resend API keys!)
    await supabase.from('audit_logs').insert({
      workspace_id,
      action: `email.${type}.sent`,
      entity_type: 'request',
      entity_id: request_id,
      metadata: {
        type,
        client_email: clientEmail,
        resend_id: resendJson.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          resend_id: resendJson.id,
          to: clientEmail,
          type,
        },
        message: `Email successfully delivered to ${clientEmail} via Resend.`,
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
