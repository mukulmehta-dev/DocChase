/**
 * DocChase — Real Production Gemini Call Verification Script
 * Target: https://ygugwtflwyqtjeuwgtca.supabase.co
 *
 * Verifies:
 * 1. Authenticated accountant session
 * 2. Real call to deployed generate-checklist Edge Function
 * 3. Successful Gemini API response (HTTP 200)
 * 4. Structured checklist content validation
 * 5. Template flow consumption (database insert)
 * 6. Intentional failure case handling (e.g. 403 / 400)
 * 7. Controlled cleanup
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > -1) {
      envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function verifyRealGeminiCall() {
  console.log('================================================================');
  console.log('🤖 DocChase — Live Production Gemini Call Verification');
  console.log('   Target Project: ' + supabaseUrl);
  console.log('================================================================\n');

  // 1. Authenticate test accountant
  console.log('Step 1: Authenticating accountant session...');
  const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
    email: 'docchase.audit.1789840548911@gmail.com',
    password: 'TestPassword123!@#Secure',
  });

  if (authErr || !authData.session) {
    console.error('❌ Failed to authenticate test accountant:', authErr?.message);
    process.exit(1);
  }

  const sessionToken = authData.session.access_token;
  const userId = authData.user.id;
  console.log(`  ✅ Authenticated (User ID: ${userId})`);

  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${sessionToken}` } },
  });

  // Get workspace
  const { data: members } = await authedClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1);

  const workspaceId = members?.[0]?.workspace_id;
  if (!workspaceId) {
    console.error('❌ No workspace found for accountant');
    process.exit(1);
  }
  console.log(`  ✅ Workspace ID: ${workspaceId}`);

  // 2. Invoke deployed generate-checklist Edge Function
  console.log('\nStep 2: Invoking deployed generate-checklist Edge Function...');
  const prompt =
    'Quarterly bookkeeping document collection for a small business. Generate the recurring documents normally requested from the client.';

  const functionUrl = `${supabaseUrl}/functions/v1/generate-checklist`;
  const startTime = Date.now();

  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      description: prompt,
    }),
  });

  const durationMs = Date.now() - startTime;
  console.log(`  Status: ${res.status} ${res.statusText} (${durationMs}ms)`);

  const json = await res.json().catch(() => ({}));

  if (res.status === 503) {
    console.log('\n⚠️ GEMINI_API_KEY is not configured in Supabase Secrets:');
    console.log(`   Error: ${json.error}`);
    console.log('\n👉 ACTION REQUIRED: Please configure the secret in Supabase using:');
    console.log('   npx supabase secrets set GEMINI_API_KEY="your_actual_key"');
    process.exit(2);
  }

  if (res.status !== 200 || !json.success) {
    console.error('\n❌ Edge Function returned error:');
    console.error('   Error:', json.error || JSON.stringify(json));
    process.exit(1);
  }

  // 3. Validate real Gemini response
  console.log('\nStep 3: Validating Gemini response structure & items...');
  const data = json.data;
  console.log(`  Template Name: "${data.template_name}"`);
  console.log(`  Frequency:     "${data.frequency}"`);
  console.log(`  Item Count:    ${data.items?.length}`);

  if (!data.template_name || !Array.isArray(data.items) || data.items.length === 0) {
    console.error('❌ Malformed data payload returned by Edge Function');
    process.exit(1);
  }

  console.log('\nGenerated Checklist Items:');
  data.items.forEach((it: any, i: number) => {
    console.log(`   ${i + 1}. [${it.required ? 'REQUIRED' : 'OPTIONAL'}] ${it.name}`);
    if (it.description) {
      console.log(`      Description: ${it.description}`);
    }
  });

  // 4. Test template flow consumption
  console.log('\nStep 4: Consuming checklist into template flow...');
  const { data: templateRow, error: tErr } = await authedClient
    .from('templates')
    .insert({
      workspace_id: workspaceId,
      name: `[AI Verified] ${data.template_name}`,
      description: `Generated via Gemini API from: ${prompt}`,
      frequency: data.frequency,
    })
    .select()
    .single();

  if (tErr || !templateRow) {
    console.error('❌ Failed to insert template record:', tErr?.message);
    process.exit(1);
  }

  const itemInserts = data.items.map((it: any) => ({
    template_id: templateRow.id,
    name: it.name,
    description: it.description,
    required: it.required,
  }));

  const { data: insertedItems, error: itemsErr } = await authedClient
    .from('template_items')
    .insert(itemInserts)
    .select();

  if (itemsErr || !insertedItems) {
    console.error('❌ Failed to insert template items:', itemsErr?.message);
    process.exit(1);
  }

  console.log(`  ✅ Successfully created template ID: ${templateRow.id} with ${insertedItems.length} items`);

  // 5. Cleanup test template
  console.log('\nStep 5: Cleaning up test template records...');
  await authedClient.from('template_items').delete().eq('template_id', templateRow.id);
  await authedClient.from('templates').delete().eq('id', templateRow.id);
  console.log('  ✅ Test template and items cleanly deleted');

  // 6. Test failure case (e.g. cross-workspace access rejection)
  console.log('\nStep 6: Verifying failure handling remains intact...');
  const failRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId: '00000000-0000-0000-0000-000000000000',
      description: prompt,
    }),
  });
  const failJson = await failRes.json().catch(() => ({}));
  if (failRes.status === 403) {
    console.log(`  ✅ Unauthorized cross-workspace call rejected with HTTP 403: ${failJson.error}`);
  } else {
    console.error(`❌ Expected HTTP 403, got ${failRes.status}`);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 REAL GEMINI PRODUCTION CALL VERIFIED SUCCESSFULLY (HTTP 200)');
  console.log('================================================================\n');
}

verifyRealGeminiCall().catch((err) => {
  console.error('Fatal error during Gemini verification:', err);
  process.exit(1);
});
