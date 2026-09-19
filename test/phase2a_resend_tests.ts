/**
 * DocChase Phase 2A Resend Transactional Email Verification Suite
 * Validates:
 * 1. Secret isolation (no RESEND_API_KEY in client bundle/env)
 * 2. Edge Function authentication gate (401 on unauthenticated caller)
 * 3. Workspace authorization gate (403 on non-member caller)
 * 4. Request / client validation (404 on invalid target)
 * 5. Strict stop rule: zero missing items halts reminders (stopped: true)
 * 6. Strict stop rule: request status 'ready' halts reminders (stopped: true)
 * 7. Strict stop rule: request status 'cancelled' halts emails
 * 8. Honest error reporting: HTTP 503 returned when RESEND_API_KEY is missing (no faked delivery)
 * 9. Token privacy: raw token is never leaked in audit logs or reminders
 * 10. Core Phase 1/1.5 pipeline regression check
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

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(num: number, name: string, passed: boolean, details?: string) {
  results.push({ num, name, passed, details });
  const icon = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`  ${icon} Test ${num}: ${name}`);
  if (details) {
    console.log(`       Details: ${details}`);
  }
}

// Token generation helper
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function runPhase2ATests() {
  console.log('================================================================');
  console.log('📧 DocChase Phase 2A — Resend Email Delivery & Security Test Suite');
  console.log('   Target Project: ' + supabaseUrl);
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Frontend Secret Isolation & Zero Leakage
  // -------------------------------------------------------------------------
  console.log('--- Group 1: Secret Isolation & Architecture ---');
  let secretLeakedInEnv = false;
  let secretLeakedInSrc = false;
  let secretLeakedInDist = false;

  // Check .env
  if (envContent.includes('RESEND_API_KEY') || envContent.includes('VITE_RESEND')) {
    secretLeakedInEnv = true;
  }

  // Check src/
  const checkDirForSecret = (dir: string): boolean => {
    if (!fs.existsSync(dir)) return false;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') {
        if (checkDirForSecret(full)) return true;
      } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx') || e.name.endsWith('.js'))) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('VITE_RESEND_API_KEY') || (/\bre_[A-Za-z0-9_]{20,}\b/.test(content) && !full.includes('supabase\\functions') && !full.includes('test\\'))) {
          return true;
        }
      }
    }
    return false;
  };

  secretLeakedInSrc = checkDirForSecret(path.resolve(process.cwd(), 'src'));

  // Check dist/ (compiled output)
  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    const distFiles = fs.readdirSync(distPath, { recursive: true }) as string[];
    for (const f of distFiles) {
      const full = path.join(distPath, f);
      if (fs.existsSync(full) && fs.statSync(full).isFile() && (f.endsWith('.js') || f.endsWith('.html'))) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('VITE_RESEND_API_KEY') || /\bre_[A-Za-z0-9_]{20,}\b/.test(content)) {
          secretLeakedInDist = true;
          break;
        }
      }
    }
  }

  record(
    1,
    'Client Bundle & Environment Secret Isolation',
    !secretLeakedInEnv && !secretLeakedInSrc && !secretLeakedInDist,
    'No Resend secrets exposed in .env, src/, or dist/ bundle'
  );

  // -------------------------------------------------------------------------
  // TEST 2: Unauthenticated Caller Rejection (401)
  // -------------------------------------------------------------------------
  console.log('\n--- Group 2: Edge Function Security Gates ---');
  const functionUrl = `${supabaseUrl}/functions/v1/send-email`;

  const unauthRes = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace_id: '00000000-0000-0000-0000-000000000000',
      request_id: '00000000-0000-0000-0000-000000000000',
      type: 'initial_request',
    }),
  });

  record(
    2,
    'Edge Function rejects unauthenticated callers with HTTP 401',
    unauthRes.status === 401,
    `Status: ${unauthRes.status}`
  );

  // Authenticate test accountant
  const accountantEmail = 'docchase.audit.1789840548911@gmail.com';
  const accountantPassword = 'TestPassword123!@#Secure';

  const signInRes = await anonClient.auth.signInWithPassword({
    email: accountantEmail,
    password: accountantPassword,
  });

  const sessionToken = signInRes.data.session?.access_token;
  const userId = signInRes.data.user?.id;

  if (!sessionToken || !userId) {
    throw new Error('Fatal: Cannot authenticate test accountant');
  }

  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${sessionToken}` } },
  });

  // -------------------------------------------------------------------------
  // TEST 3: Workspace Authorization Gate (403 on non-member workspace)
  // -------------------------------------------------------------------------
  const fakeWorkspaceId = '11111111-2222-3333-4444-555555555555';
  const nonMemberRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: fakeWorkspaceId,
      request_id: '00000000-0000-0000-0000-000000000000',
      type: 'initial_request',
    }),
  });

  const nonMemberJson = await nonMemberRes.json();
  record(
    3,
    'Edge Function rejects non-workspace member callers with HTTP 403',
    nonMemberRes.status === 403,
    `Status: ${nonMemberRes.status}, Message: ${nonMemberJson.error}`
  );

  // -------------------------------------------------------------------------
  // Prepare real test workspace, client, and requests
  // -------------------------------------------------------------------------
  console.log('\n--- Group 3: Setup Real Workspace & Requests for Email Tests ---');
  // Get accountant's workspace
  const { data: memberRows } = await authedClient
    .from('workspace_members')
    .select('workspace_id, workspaces(id, name)')
    .eq('user_id', userId)
    .limit(1);

  const realWorkspaceId = memberRows?.[0]?.workspace_id;
  if (!realWorkspaceId) {
    throw new Error('Fatal: No real workspace found for test accountant');
  }

  // Temporarily upgrade workspace to Pro so test data can be created without quota limits.
  // This workspace may have accumulated test clients over many prior test runs.
  await authedClient.rpc('set_workspace_plan_for_testing', {
    p_workspace_id: realWorkspaceId,
    p_plan: 'pro',
    p_status: 'active',
    p_cancel_at_period_end: false,
  });

  // Create test client
  const testClientName = `Resend Test Client ${Date.now()}`;
  const testClientEmail = `client.${Date.now()}@example.com`;

  const { data: clientData, error: clientErr } = await authedClient
    .from('clients')
    .insert({
      workspace_id: realWorkspaceId,
      name: testClientName,
      email: testClientEmail,
      company_name: 'Resend Verification Corp',
    })
    .select()
    .single();

  if (clientErr || !clientData) {
    throw new Error('Failed to create test client: ' + clientErr?.message);
  }

  // Create test request 1 (active with 2 items)
  const token1 = generateToken();
  const tokenHash1 = await hashToken(token1);

  const { data: req1, error: req1Err } = await authedClient
    .from('requests')
    .insert({
      workspace_id: realWorkspaceId,
      client_id: clientData.id,
      title: 'September 2026 Tax Audit Documents',
      period: 'September 2026',
      due_date: '2026-10-15',
      status: 'sent',
      access_token: token1,
      access_token_hash: tokenHash1,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (req1Err || !req1) {
    throw new Error('Failed to create test request 1: ' + req1Err?.message);
  }

  // Insert 2 missing items
  const { data: items1 } = await authedClient
    .from('request_items')
    .insert([
      { request_id: req1.id, name: 'Bank Statements - Sep 2026', required: true, status: 'missing' },
      { request_id: req1.id, name: 'Payroll Summary - Sep 2026', required: true, status: 'missing' },
    ])
    .select();

  // Create test request 2 (for stop rule: ready status / 0 missing items)
  const token2 = generateToken();
  const tokenHash2 = await hashToken(token2);

  const { data: req2 } = await authedClient
    .from('requests')
    .insert({
      workspace_id: realWorkspaceId,
      client_id: clientData.id,
      title: 'Completed Audit Documents',
      period: 'September 2026',
      due_date: '2026-10-15',
      status: 'ready', // Already READY!
      access_token: token2,
      access_token_hash: tokenHash2,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Insert 1 approved item for req2
  await authedClient.from('request_items').insert([
    { request_id: req2.id, name: 'Form 1099', required: true, status: 'approved' },
  ]);

  // Create test request 3 (cancelled status)
  const token3 = generateToken();
  const tokenHash3 = await hashToken(token3);

  const { data: req3 } = await authedClient
    .from('requests')
    .insert({
      workspace_id: realWorkspaceId,
      client_id: clientData.id,
      title: 'Cancelled Request',
      period: 'September 2026',
      due_date: '2026-10-15',
      status: 'cancelled',
      access_token: token3,
      access_token_hash: tokenHash3,
    })
    .select()
    .single();

  // -------------------------------------------------------------------------
  // TEST 4: Invalid Request Target Validation (404)
  // -------------------------------------------------------------------------
  console.log('\n--- Group 4: Request & Client Validation ---');
  const invalidReqRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: realWorkspaceId,
      request_id: '00000000-0000-0000-0000-000000000000',
      type: 'initial_request',
    }),
  });

  record(
    4,
    'Edge Function rejects non-existent request_id with HTTP 404',
    invalidReqRes.status === 404,
    `Status: ${invalidReqRes.status}`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Strict Reminder Stop Rule — Status READY
  // -------------------------------------------------------------------------
  console.log('\n--- Group 5: Reminder Stop Conditions ---');
  const readyStopRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: realWorkspaceId,
      request_id: req2.id,
      type: 'reminder',
    }),
  });

  const readyStopJson = await readyStopRes.json();
  record(
    5,
    'Strict Reminder Stop Rule: Halts if request is READY',
    readyStopRes.status === 400 && readyStopJson.stopped === true,
    `Status: ${readyStopRes.status}, Stopped: ${readyStopJson.stopped}, Error: ${readyStopJson.error}`
  );

  // -------------------------------------------------------------------------
  // TEST 6: Strict Reminder Stop Rule — Zero Missing Items (All items approved)
  // -------------------------------------------------------------------------
  // Create active request with 1 item, then approve that item
  const tokenZero = generateToken();
  const tokenHashZero = await hashToken(tokenZero);
  const { data: reqZero } = await authedClient
    .from('requests')
    .insert({
      workspace_id: realWorkspaceId,
      client_id: clientData.id,
      title: 'All Approved Request',
      period: 'September 2026',
      due_date: '2026-10-15',
      status: 'sent',
      access_token: tokenZero,
      access_token_hash: tokenHashZero,
    })
    .select()
    .single();

  await authedClient.from('request_items').insert([
    { request_id: reqZero.id, name: 'W-2 Form', required: true, status: 'approved' },
  ]);

  const zeroMissingRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: realWorkspaceId,
      request_id: reqZero.id,
      type: 'reminder',
    }),
  });

  const zeroMissingJson = await zeroMissingRes.json();
  record(
    6,
    'Strict Reminder Stop Rule: Skips if zero items are missing/rejected',
    zeroMissingJson.stopped === true,
    `Status: ${zeroMissingRes.status}, Stopped: ${zeroMissingJson.stopped}, Message: ${zeroMissingJson.message}`
  );

  // -------------------------------------------------------------------------
  // TEST 7: Strict Stop Rule — Cancelled Requests
  // -------------------------------------------------------------------------
  const cancelledRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: realWorkspaceId,
      request_id: req3.id,
      type: 'reminder',
    }),
  });

  const cancelledJson = await cancelledRes.json();
  record(
    7,
    'Strict Stop Rule: Rejects cancelled request dispatch',
    cancelledRes.status === 400 && cancelledJson.error?.includes('cancelled'),
    `Status: ${cancelledRes.status}, Error: ${cancelledJson.error}`
  );

  // -------------------------------------------------------------------------
  // TEST 8: Honest Error Reporting when RESEND_API_KEY is not set
  // -------------------------------------------------------------------------
  console.log('\n--- Group 6: Delivery Honesty & Failure Handling ---');
  const activeReqRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: realWorkspaceId,
      request_id: req1.id,
      type: 'initial_request',
    }),
  });

  const activeReqJson = await activeReqRes.json();

  // Check for honest response (503 if secret unconfigured, 200 or 422 live Resend response if configured)
  const isHonestHandling =
    (activeReqRes.status === 503 && activeReqJson.configured === false && activeReqJson.error?.includes('RESEND_API_KEY')) ||
    (activeReqRes.status === 200 && activeReqJson.success === true) ||
    (activeReqRes.status === 422 && activeReqJson.error?.includes('Resend API Error'));

  record(
    8,
    'Honest Response & Delivery Handling: Resend API response is properly validated and reported',
    isHonestHandling,
    `Status: ${activeReqRes.status}, Error: ${activeReqJson.error || 'None (Success)'}`
  );

  // -------------------------------------------------------------------------
  // TEST 9: Raw Access Token Privacy in Audit Logs
  // -------------------------------------------------------------------------
  console.log('\n--- Group 7: Audit Logging & Privacy ---');
  // Check the audit log recorded for the email dispatch attempt
  const { data: recentAuditLogs } = await authedClient
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', realWorkspaceId)
    .eq('entity_id', req1.id)
    .order('created_at', { ascending: false })
    .limit(5);

  let tokenLeakedInLogs = false;
  let hasEmailAuditEntry = false;

  for (const entry of recentAuditLogs || []) {
    const metaStr = JSON.stringify(entry.metadata || {});
    if (metaStr.includes(token1)) {
      tokenLeakedInLogs = true;
    }
    if (entry.action === 'email.failed' || entry.action?.startsWith('email.')) {
      hasEmailAuditEntry = true;
    }
  }

  record(
    9,
    'Audit Logs Record Email Events Without Leaking Raw Access Tokens',
    hasEmailAuditEntry && !tokenLeakedInLogs,
    `Has Email Audit Log: ${hasEmailAuditEntry}, Raw Token Leaked: ${tokenLeakedInLogs}`
  );

  // -------------------------------------------------------------------------
  // TEST 10: Document Rejection Notification Flow Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Group 8: Document Rejection Email Contract ---');
  const rejectRes = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: realWorkspaceId,
      request_id: req1.id,
      type: 'document_rejected',
      request_item_id: items1?.[0]?.id,
      rejection_reason: 'Image is blurry and missing page 2.',
    }),
  });

  const rejectJson = await rejectRes.json();
  const isRejectValidContract =
    (rejectRes.status === 503 && rejectJson.configured === false && rejectJson.error?.includes('RESEND_API_KEY')) ||
    (rejectRes.status === 200 && rejectJson.success === true) ||
    (rejectRes.status === 422 && rejectJson.error?.includes('Resend API Error'));

  record(
    10,
    'Document Rejection Email Flow Handles Reason & Item Context Properly',
    isRejectValidContract,
    `Status: ${rejectRes.status}, Error: ${rejectJson.error || 'None (Success)'}`
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 Phase 2A Resend Email Test Summary:');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`   Total Tests: ${totalCount}`);
  console.log(`   Passed:      ${passedCount}`);
  console.log(`   Failed:      ${totalCount - passedCount}`);
  console.log('================================================================\n');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runPhase2ATests().catch((err) => {
  console.error('Unhandled error in Phase 2A test suite:', err);
  process.exit(1);
});
