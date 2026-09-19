// Supabase Edge Function: generate-checklist
// Server-side AI Checklist Generation using Gemini API with server-side secrets and authentication

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_FREQUENCIES = ['monthly', 'quarterly', 'yearly', 'custom'] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    // 1. Authenticate user from Authorization header FIRST
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

    const { description, workspaceId } = body || {};

    if (!workspaceId || typeof workspaceId !== 'string' || !UUID_REGEX.test(workspaceId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Validation error: valid workspaceId UUID is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Validation error: description is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (description.length > 2000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Validation error: description exceeds 2000 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify workspace membership (Strict authorization boundary)
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

    if (memError || !membership) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: you are not a member of this workspace.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Server-Side AI Feature Entitlement Gate (Phase 3)
    // Free workspaces cannot access AI checklist generation
    const { data: entitlements, error: entError } = await supabaseAdmin.rpc(
      'get_workspace_entitlements',
      { p_workspace_id: workspaceId }
    );

    if (entError || !entitlements || !entitlements.ai_checklist_enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI_FEATURE_NOT_ALLOWED: AI checklist generation is not available on the Free plan. Please upgrade to Starter or Pro.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Verify server-side GEMINI_API_KEY secret
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          error: 'GEMINI_API_KEY is not configured in server environment secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Call Gemini API securely from the server
    const systemPrompt = `You are a certified bookkeeping and accounting operations assistant for DocChase.
Generate a structured document request checklist for an accounting firm requesting records from a client.
Respond ONLY with a valid JSON object matching this exact schema:
{
  "template_name": string,
  "frequency": "monthly" | "quarterly" | "yearly" | "custom",
  "items": [
    {
      "name": string,
      "description": string,
      "required": boolean
    }
  ]
}`;

    const modelName = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash';
    let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    let res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `Client Industry / Needs: ${description.trim()}` },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    // If model returns 503 (demand spike / temporary unavailable) or 404, try alternative modern models
    if (res.status === 503 || res.status === 404) {
      const candidates = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.6-flash'];
      for (const altModel of candidates) {
        if (altModel === modelName) continue;
        await new Promise((r) => setTimeout(r, 1000));
        const altUrl = `https://generativelanguage.googleapis.com/v1beta/models/${altModel}:generateContent?key=${geminiApiKey}`;
        const altRes = await fetch(altUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: `Client Industry / Needs: ${description.trim()}` },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });
        if (altRes.ok) {
          res = altRes;
          break;
        }
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `AI generation failed (${res.status}): ${errText.slice(0, 300)}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiJson = await res.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned empty response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedChecklist: any;
    try {
      parsedChecklist = JSON.parse(rawText.trim());
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned malformed JSON response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Rigid Structured Output Validation
    if (!parsedChecklist || typeof parsedChecklist !== 'object' || Array.isArray(parsedChecklist)) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI response is not a valid JSON object' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templateName = typeof parsedChecklist.template_name === 'string' ? parsedChecklist.template_name.trim() : '';
    if (!templateName || templateName.length < 2 || templateName.length > 150) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI response contains invalid template_name' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const freq = VALID_FREQUENCIES.includes(parsedChecklist.frequency) ? parsedChecklist.frequency : 'monthly';

    if (!Array.isArray(parsedChecklist.items) || parsedChecklist.items.length === 0 || parsedChecklist.items.length > 30) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI response items must be a non-empty array (1-30 items)' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedItems: Array<{ name: string; description: string; required: boolean }> = [];
    for (const it of parsedChecklist.items) {
      if (!it || typeof it !== 'object') {
        return new Response(
          JSON.stringify({ success: false, error: 'AI checklist item has invalid structure' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const name = typeof it.name === 'string' ? it.name.trim() : '';
      if (!name || name.length < 2 || name.length > 120) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI checklist item has missing or invalid name' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const desc = typeof it.description === 'string' ? it.description.trim().slice(0, 300) : '';
      const reqFlag = typeof it.required === 'boolean' ? it.required : Boolean(it.required);
      validatedItems.push({
        name,
        description: desc,
        required: reqFlag,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          template_name: templateName,
          frequency: freq,
          items: validatedItems,
        },
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
