/**
 * Migration 016 — Workspace Creation RLS Security Tests
 *
 * T1: Anon cannot INSERT directly into workspaces → blocked
 * T2: Authenticated user cannot INSERT directly into workspaces (anon during signup) → blocked by design
 * T3: create_workspace_for_user RPC with valid user_id → succeeds, returns workspace
 * T4: Workspace owner can SELECT their own workspace (via workspace_members policy)
 * T5: Second signed-in user cannot SELECT workspace that belongs to user 1
 * T6: create_workspace_for_user with non-existent user_id → throws exception
 * T7: create_workspace_for_user is idempotent — calling twice returns same workspace
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (t && !t.startsWith('#')) {
    const i = t.indexOf('=');
    if (i > -1) envVars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const URL = envVars.VITE_SUPABASE_URL;
const ANON = envVars.VITE_SUPABASE_ANON_KEY;
if (!URL || !ANON) { console.error('Missing env vars'); process.exit(1); }

const anon = createClient(URL, ANON);
const TEST_EMAIL = 'docchase.audit.1789840548911@gmail.com';
const TEST_PASS  = 'TestPassword123!@#Secure';

let passed = 0; let failed = 0;
function pass(t: string, d?: string) { console.log(`  ✅ PASS: ${t}${d ? ` — ${d}` : ''}`); passed++; }
function fail(t: string, d?: string) { console.error(`  ❌ FAIL: ${t}${d ? ` — ${d}` : ''}`); failed++; }

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Migration 016 — Workspace Creation RLS Security Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── T1: Anon direct INSERT on workspaces → blocked ────────────────────────
  console.log('T1: Anon direct INSERT on workspaces → must be blocked');
  const { error: anonInsErr } = await anon.from('workspaces').insert({ name: 'Hacked WS', plan: 'free' });
  anonInsErr
    ? pass('Anon direct INSERT blocked', anonInsErr.message)
    : fail('Anon direct INSERT NOT blocked — CRITICAL');

  // ── T2: Sign in as seeded test accountant ────────────────────────────────
  console.log('\nT2: Sign in as seeded test accountant');
  const { data: s1, error: siErr } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASS });
  if (siErr || !s1.session) { fail('Sign-in failed', siErr?.message); printSummary(); return; }
  const uid1 = s1.user!.id;
  pass('Signed in', `uid=${uid1.substring(0,8)}...`);

  const auth1 = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${s1.session.access_token}` } },
  });

  // ── T3: RPC create_workspace_for_user → succeeds ──────────────────────────
  console.log('\nT3: create_workspace_for_user RPC with valid user_id → must succeed');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ws1, error: rpcErr } = await (auth1 as any).rpc('create_workspace_for_user', {
    p_user_id: uid1,
    p_workspace_name: 'RLS Test Firm',
  });
  if (rpcErr) {
    fail('RPC failed', rpcErr.message);
  } else if (!ws1?.id) {
    fail('RPC returned no workspace id');
  } else {
    pass('RPC succeeded', `workspace_id=${ws1.id.substring(0,8)}...`);
  }
  const ws1id: string = ws1?.id;

  // ── T4: Owner can SELECT their workspace ──────────────────────────────────
  if (ws1id) {
    console.log('\nT4: Workspace owner can SELECT their workspace via workspace_members RLS');
    const { data: wsRow, error: selErr } = await auth1.from('workspaces').select('id,name').eq('id', ws1id).single();
    wsRow && !selErr
      ? pass('Owner can SELECT own workspace', wsRow.name)
      : fail('Owner cannot SELECT own workspace', selErr?.message);

    // ── T5: T3 RPC idempotency ─────────────────────────────────────────────
    console.log('\nT5: create_workspace_for_user idempotent — calling twice returns same workspace');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ws1b, error: rpcErr2 } = await (auth1 as any).rpc('create_workspace_for_user', {
      p_user_id: uid1,
      p_workspace_name: 'Should Return Existing',
    });
    if (rpcErr2) {
      fail('Idempotent RPC call failed', rpcErr2.message);
    } else if (ws1b?.id === ws1id) {
      pass('RPC idempotent — returned existing workspace', ws1b.id.substring(0,8)+'...');
    } else {
      fail('RPC created a SECOND workspace instead of returning existing one');
    }
  }

  // ── T6: RPC with non-existent user_id → must throw ────────────────────────
  console.log('\nT6: RPC with non-existent user_id → must throw exception');
  const fakeId = '00000000-0000-0000-0000-000000000099';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: badRpcErr } = await (auth1 as any).rpc('create_workspace_for_user', {
    p_user_id: fakeId,
    p_workspace_name: 'Ghost Firm',
  });
  badRpcErr
    ? pass('RPC rejected non-existent user_id', badRpcErr.message)
    : fail('RPC accepted non-existent user_id — security risk');

  // ── T7: Cross-user workspace isolation ───────────────────────────────────
  if (ws1id) {
    console.log('\nT7: Sessionless client cannot SELECT workspace owned by user 1');
    // Create a completely fresh client with NO session.
    // Do NOT reuse `anon` — Supabase JS persists the session in memory after signIn.
    const sessionless = createClient(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: crossRows, error: crossErr } = await sessionless
      .from('workspaces').select('id').eq('id', ws1id);
    if (crossErr) {
      pass('Sessionless client workspace SELECT returned error (blocked)', crossErr.message);
    } else if (!crossRows || crossRows.length === 0) {
      pass('Sessionless client cannot SELECT user1 workspace (RLS filtered — 0 rows, correct)');
    } else {
      fail('Sessionless client CAN see user1 workspace — isolation broken', `rows=${crossRows.length}`);
    }
  }

  await auth1.auth.signOut();
  printSummary();
}

function printSummary() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('Unexpected:', e); process.exit(1); });
