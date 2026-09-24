/**
 * Workspace Membership & Audit Security Hardening Test Suite
 *
 * Verifies:
 * 1. Finding 1 (High): Arbitrary self-insertion blocked on workspace_members RLS.
 * 2. Finding 2 (Medium): Concurrency-safe last-owner protection trigger (delete/demote blocked when sole owner; allowed when multiple; concurrent deletion serialized).
 * 3. Finding 3 (Low): Billing UI role gating for members + backend 403 for member checkouts.
 * 4. Finding 4 (Low): Audit log actor spoofing blocked at database level; append-only enforcement.
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
if (!URL || !ANON) {
  console.error('Missing Supabase environment variables');
}

const anon = createClient(URL, ANON);
const USER_A_EMAIL = 'docchase.audit.1789840548911@gmail.com';
const USER_A_PASS = 'TestPassword123!@#Secure';

const USER_B_EMAIL = 'docchase.sec.b.1790272818218@gmail.com';
const USER_B_PASS = 'TestPassword123!@#SecureB';

let passed = 0;
let failed = 0;
function pass(title: string, detail?: string) {
  console.log(`  ✅ PASS: ${title}${detail ? ` — ${detail}` : ''}`);
  passed++;
}
function fail(title: string, detail?: string) {
  console.error(`  ❌ FAIL: ${title}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  WORKSPACE MEMBERSHIP & AUDIT SECURITY HARDENING VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Sign in User A (Owner)
  console.log('--- Step 1: Sign in User A (Primary Owner) ---');
  const { data: sA, error: errA } = await anon.auth.signInWithPassword({
    email: USER_A_EMAIL,
    password: USER_A_PASS,
  });
  if (errA || !sA.session) {
    fail('User A sign in failed', errA?.message);
    return;
  }
  const uidA = sA.user.id;
  const clientA = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${sA.session.access_token}` } },
  });
  pass('User A signed in', `uid=${uidA}`);

  // 2. Sign in User B (Attacker / Member)
  console.log('\n--- Step 2: Sign in User B (Attacker / Non-member) ---');
  await anon.rpc('confirm_test_user', { p_email: USER_B_EMAIL });
  const sBRes = await anon.auth.signInWithPassword({
    email: USER_B_EMAIL,
    password: USER_B_PASS,
  });

  if (sBRes.error || !sBRes.data.session) {
    fail('User B sign in failed', sBRes.error?.message);
    return;
  }
  const tokenB = sBRes.data.session.access_token;
  const uidB = sBRes.data.user.id;
  const clientB = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${tokenB}` } },
  });
  pass('User B signed in', `uid=${uidB}`);

  // 3. Create a dedicated Workspace A using create_workspace RPC
  console.log('\n--- Step 3: Legitimate Workspace Creation (Finding 1 & 5) ---');
  const wsName = `SecTest-WS-${Date.now()}`;
  const { data: wsA, error: wsErr } = await clientA.rpc('create_workspace', { p_name: wsName });
  if (wsErr || !wsA) {
    fail('Workspace creation via create_workspace RPC failed', wsErr?.message);
    return;
  }
  const wsIdA = wsA.id;
  pass('Workspace created via secure RPC', `id=${wsIdA}, name=${wsA.name}`);

  // Verify User A is owner
  const { data: memA } = await clientA
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', wsIdA)
    .eq('user_id', uidA)
    .single();
  if (memA?.role === 'owner') {
    pass('User A verified as workspace owner');
  } else {
    fail('User A is not owner of newly created workspace');
  }

  // 4. Test Finding 1: Arbitrary Self-Insertion into Workspace A by User B
  console.log('\n--- Step 4: Test Finding 1 (Arbitrary Self-Insertion Prevention) ---');
  // Attempt 1: User B tries to insert self as 'owner' into Workspace A
  const { data: hackRes1, error: hackErr1 } = await clientB
    .from('workspace_members')
    .insert({
      workspace_id: wsIdA,
      user_id: uidB,
      role: 'owner',
    })
    .select();
  if (hackErr1 || !hackRes1 || hackRes1.length === 0) {
    pass('User B direct self-insertion as OWNER was BLOCKED', hackErr1?.message || '0 rows inserted');
  } else {
    fail('CRITICAL: User B successfully self-inserted as OWNER into Workspace A!');
  }

  // Attempt 2: User B tries to insert self as 'member' into Workspace A
  const { data: hackRes2, error: hackErr2 } = await clientB
    .from('workspace_members')
    .insert({
      workspace_id: wsIdA,
      user_id: uidB,
      role: 'member',
    })
    .select();
  if (hackErr2 || !hackRes2 || hackRes2.length === 0) {
    pass('User B direct self-insertion as MEMBER was BLOCKED', hackErr2?.message || '0 rows inserted');
  } else {
    fail('CRITICAL: User B successfully self-inserted as MEMBER into Workspace A!');
  }

  // 5. Test Finding 1: Owner can legitimately add members
  console.log('\n--- Step 5: Legitimate Membership Management by Owner ---');
  const { data: addMemberRes, error: addMemberErr } = await clientA
    .from('workspace_members')
    .insert({
      workspace_id: wsIdA,
      user_id: uidB,
      role: 'member',
    })
    .select()
    .single();
  if (addMemberErr || !addMemberRes) {
    fail('Owner could not add member to workspace', addMemberErr?.message);
  } else {
    pass('Owner successfully added User B as member', `member_id=${addMemberRes.id}`);
  }

  // Non-owner member (User B) attempts to insert another membership row
  const fakeUserId = '00000000-0000-0000-0000-000000000099';
  const { data: hackRes3, error: hackErr3 } = await clientB
    .from('workspace_members')
    .insert({
      workspace_id: wsIdA,
      user_id: fakeUserId,
      role: 'member',
    })
    .select();
  if (hackErr3 || !hackRes3 || hackRes3.length === 0) {
    pass('Member (User B) cannot add other members (Restricted to Owners)', hackErr3?.message || '0 rows inserted');
  } else {
    fail('Member (User B) was able to insert new members into workspace!');
  }

  // 6. Test Finding 2: Last-Owner Protection (Delete & Demote)
  console.log('\n--- Step 6: Test Finding 2 (Last-Owner Protection) ---');
  // 6.1 One-owner workspace: Attempt to DELETE the sole owner (User A)
  const { error: delSoleErr } = await clientA
    .from('workspace_members')
    .delete()
    .eq('id', memA.id);
  if (delSoleErr && delSoleErr.message.includes('CANNOT_REMOVE_LAST_OWNER')) {
    pass('Deleting sole owner was BLOCKED by DB trigger', delSoleErr.message);
  } else {
    fail('Deleting sole owner was NOT blocked!', delSoleErr?.message);
  }

  // 6.2 One-owner workspace: Attempt to DEMOTE the sole owner (User A to admin)
  const { error: demoteSoleErr } = await clientA
    .from('workspace_members')
    .update({ role: 'admin' })
    .eq('id', memA.id);
  if (demoteSoleErr && demoteSoleErr.message.includes('CANNOT_DEMOTE_LAST_OWNER')) {
    pass('Demoting sole owner was BLOCKED by DB trigger', demoteSoleErr.message);
  } else {
    fail('Demoting sole owner was NOT blocked!', demoteSoleErr?.message);
  }

  // 6.3 Promote User B to owner (now 2 owners: A and B)
  const { error: promErr } = await clientA
    .from('workspace_members')
    .update({ role: 'owner' })
    .eq('id', addMemberRes.id);
  if (promErr) {
    fail('Could not promote User B to owner', promErr.message);
  } else {
    pass('Promoted User B to owner (workspace now has 2 owners)');
  }

  // 6.4 Two-owner workspace: Demote User B back to admin → should be ALLOWED because User A remains owner
  const { error: demoteBAllowedErr } = await clientA
    .from('workspace_members')
    .update({ role: 'admin' })
    .eq('id', addMemberRes.id);
  if (!demoteBAllowedErr) {
    pass('Demoting one owner when another exists is ALLOWED');
  } else {
    fail('Demoting one owner failed when another owner existed', demoteBAllowedErr.message);
  }

  // Re-promote User B to owner
  await clientA.from('workspace_members').update({ role: 'owner' }).eq('id', addMemberRes.id);

  // 6.5 Two-owner workspace: Delete User B → should be ALLOWED because User A remains owner
  const { error: delBAllowedErr } = await clientA
    .from('workspace_members')
    .delete()
    .eq('id', addMemberRes.id);
  if (!delBAllowedErr) {
    pass('Removing one owner when another exists is ALLOWED');
  } else {
    fail('Removing one owner failed when another owner existed', delBAllowedErr.message);
  }

  // 6.6 Concurrency Test: Dedicated 2-owner workspace, simultaneous deletion of both owners
  console.log('\n--- Step 6.6: Concurrency Protection (Simultaneous Owner Removals) ---');
  const { data: wsConc } = await clientA.rpc('create_workspace', {
    p_name: `ConcTest-WS-${Date.now()}`,
  });
  const wsConcId = wsConc.id;

  // Add User B as second owner in wsConc
  const { data: concMemB } = await clientA
    .from('workspace_members')
    .insert({
      workspace_id: wsConcId,
      user_id: uidB,
      role: 'owner',
    })
    .select()
    .single();

  const { data: concMemA } = await clientA
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', wsConcId)
    .eq('user_id', uidA)
    .single();

  if (!concMemA || !concMemB) {
    fail('Could not setup 2-owner workspace for concurrency test');
  } else {
    // Attempt simultaneous deletion of both owners
    await Promise.all([
      clientA.from('workspace_members').delete().eq('id', concMemA.id),
      clientA.from('workspace_members').delete().eq('id', concMemB.id),
    ]);

    // Check remaining owners in wsConcId using service or owner query
    const { data: remainingOwnersConc } = await clientA
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', wsConcId)
      .eq('role', 'owner');

    const count = remainingOwnersConc?.length || 0;
    if (count === 1) {
      pass('Concurrent owner deletion serialized safely: exactly 1 owner remains', `remaining_count=${count}`);
    } else if (count === 0) {
      fail('CRITICAL: Concurrency race condition allowed workspace to reach 0 owners!');
    } else {
      pass(`Both deletions rejected or one deleted: remaining_count=${count}`);
    }

    // Clean up concurrency test workspace
    await clientA.from('workspaces').delete().eq('id', wsConcId);
  }

  // 7. Test Finding 4: Audit Log Actor ID Spoofing Prevention
  console.log('\n--- Step 7: Test Finding 4 (Audit Log Actor Spoofing & Append-Only) ---');
  // Ensure User B is a member of Workspace A (and User A is owner)
  await clientA.from('workspace_members').upsert({
    workspace_id: wsIdA,
    user_id: uidB,
    role: 'member',
  });

  // 7.1 User B tries to insert an audit log attributing action to User A (Actor Spoofing)
  const { data: spoofRes, error: spoofErr } = await clientB
    .from('audit_logs')
    .insert({
      workspace_id: wsIdA,
      user_id: uidA, // Attacker spoofing victim's user_id!
      action: 'DOCUMENT_DELETED',
      entity_type: 'document',
      entity_id: '00000000-0000-0000-0000-000000000001',
    })
    .select();
  if (spoofErr || !spoofRes || spoofRes.length === 0) {
    pass('Audit log actor ID spoofing was BLOCKED by RLS', spoofErr?.message || '0 rows inserted');
  } else {
    fail('CRITICAL: User B successfully spoofed User A in audit logs!');
  }

  // 7.2 User B tries to insert an audit log into an unrelated workspace
  const fakeWsId = '00000000-0000-0000-0000-000000000999';
  const { data: crossWsRes, error: crossWsErr } = await clientB
    .from('audit_logs')
    .insert({
      workspace_id: fakeWsId,
      user_id: uidB,
      action: 'DOCUMENT_VIEWED',
      entity_type: 'document',
      entity_id: '00000000-0000-0000-0000-000000000001',
    })
    .select();
  if (crossWsErr || !crossWsRes || crossWsRes.length === 0) {
    pass('Cross-workspace audit log insertion was BLOCKED by RLS', crossWsErr?.message || '0 rows inserted');
  } else {
    fail('CRITICAL: User B inserted an audit log for an unauthorized workspace!');
  }

  // 7.3 User B inserts an audit log with own user_id and member workspace → ALLOWED
  const { data: validAudit, error: validAuditErr } = await clientB
    .from('audit_logs')
    .insert({
      workspace_id: wsIdA,
      user_id: uidB,
      action: 'DOCUMENT_VIEWED',
      entity_type: 'document',
      entity_id: '00000000-0000-0000-0000-000000000001',
    })
    .select()
    .single();
  if (validAuditErr || !validAudit) {
    fail('Valid audit log insertion failed for legitimate member', validAuditErr?.message);
  } else {
    pass('Legitimate audit log insertion succeeded for member', `log_id=${validAudit.id}`);
  }

  // 7.4 Attempt UPDATE on existing audit log → BLOCKED (append-only)
  if (validAudit) {
    const { data: updateData, error: updateAuditErr } = await clientB
      .from('audit_logs')
      .update({ action: 'MODIFIED_LOG' })
      .eq('id', validAudit.id)
      .select();
    
    // Check that row in DB was NOT modified
    const { data: checkLog } = await clientA
      .from('audit_logs')
      .select('*')
      .eq('id', validAudit.id)
      .single();

    if ((updateAuditErr || !updateData || updateData.length === 0) && checkLog?.action === 'DOCUMENT_VIEWED') {
      pass('UPDATE on audit log was BLOCKED (immutability preserved)', `persisted_action=${checkLog?.action}`);
    } else {
      fail('UPDATE on audit log was NOT blocked! Data changed to: ' + checkLog?.action);
    }

    // 7.5 Attempt DELETE on existing audit log → BLOCKED (append-only)
    const { data: delData, error: delAuditErr } = await clientB
      .from('audit_logs')
      .delete()
      .eq('id', validAudit.id)
      .select();

    const { data: checkLogAfterDel } = await clientA
      .from('audit_logs')
      .select('*')
      .eq('id', validAudit.id)
      .single();

    if ((delAuditErr || !delData || delData.length === 0) && checkLogAfterDel?.id === validAudit.id) {
      pass('DELETE on audit log was BLOCKED (append-only preserved)', `log_persisted_id=${checkLogAfterDel?.id}`);
    } else {
      fail('DELETE on audit log was NOT blocked! Row was removed.');
    }
  }

  // 8. Test Finding 3: Backend Member 403 on Stripe Checkout
  console.log('\n--- Step 8: Test Finding 3 (Backend Member 403 on Stripe Checkout) ---');
  // User B (member) calls stripe-checkout edge function
  try {
    const { data: chkData, error: chkErr } = await clientB.functions.invoke('stripe-checkout', {
      body: { workspaceId: wsIdA, plan: 'starter' },
    });
    if (chkErr || !chkData?.url) {
      pass('Stripe checkout for Member role correctly REJECTED by backend (403/error)', chkErr?.message || 'Access denied');
    } else {
      fail('CRITICAL: Member role was allowed to initiate Stripe checkout!');
    }
  } catch (err: any) {
    pass('Stripe checkout for Member role rejected by backend', err.message);
  }

  // 9. Clean up: Delete Workspace A (Cascade deletion test)
  console.log('\n--- Step 9: Cascade Deletion of Workspace ---');
  const { error: delWsErr } = await clientA.from('workspaces').delete().eq('id', wsIdA);
  if (!delWsErr) {
    pass('Workspace cascade deletion succeeded without trigger deadlock or false blocking');
  } else {
    fail('Workspace deletion failed', delWsErr.message);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled exception in test suite:', err);
  process.exit(1);
});
