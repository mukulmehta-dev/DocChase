/**
 * DocChase Phase 5 Billing Quotas, Client Reactivation & AI Entitlements Test Suite
 */

if (!globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0,
  } as any;
}

import { clientService } from '../src/services/clients';
import { billingService } from '../src/services/billing';

interface TestStats {
  passed: number;
  failed: number;
  total: number;
}

const stats: TestStats = { passed: 0, failed: 0, total: 0 };

function assert(condition: boolean, testName: string, failureDetails?: string) {
  stats.total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    stats.passed++;
  } else {
    stats.failed++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (failureDetails) {
      console.error(`     Details: ${failureDetails}`);
    }
  }
}

async function runBillingQuotaTests() {
  console.log('====================================================');
  console.log('💳 DocChase Phase 5 Billing & Quota Workability Tests');
  console.log('====================================================\n');

  const workspaceId = 'ws_billing_' + Math.random().toString(36).substring(2, 7);

  // -------------------------------------------------------------
  // TEST GROUP 1: Client Creation Limits (Free Plan: 3 Active Clients Max)
  // -------------------------------------------------------------
  console.log('📌 Test Group 1: Free Plan (3 Active Clients Limit)');

  // Create Client 1 (1/3)
  const c1 = await clientService.createClient(workspaceId, 'free', {
    name: 'Client 1',
    company_name: 'Alpha Corp',
    email: 'alpha@example.com',
  });
  assert(c1.status === 'active', 'Client 1 created (1/3)');

  // Create Client 2 (2/3)
  const c2 = await clientService.createClient(workspaceId, 'free', {
    name: 'Client 2',
    company_name: 'Beta LLC',
    email: 'beta@example.com',
  });
  assert(c2.status === 'active', 'Client 2 created (2/3)');

  // Create Client 3 (3/3)
  const c3 = await clientService.createClient(workspaceId, 'free', {
    name: 'Client 3',
    company_name: 'Gamma Inc',
    email: 'gamma@example.com',
  });
  assert(c3.status === 'active', 'Client 3 created (3/3 - Limit Reached)');

  // Attempt Client 4 on Free plan (4/3) -> MUST BE BLOCKED
  let blockedC4 = false;
  let blockedMsg = '';
  try {
    await clientService.createClient(workspaceId, 'free', {
      name: 'Client 4',
      company_name: 'Delta Ventures',
      email: 'delta@example.com',
    });
  } catch (err: any) {
    blockedC4 = true;
    blockedMsg = err.message;
  }
  assert(
    blockedC4 && blockedMsg.includes('Plan limit reached'),
    '4th Client creation on Free plan is blocked by client quota',
    `Error was: ${blockedMsg}`
  );

  // -------------------------------------------------------------
  // TEST GROUP 2: Archived Clients & Reactivation Quota Enforcement
  // -------------------------------------------------------------
  console.log('\n📌 Test Group 2: Client Archiving & Reactivation Quota Enforcement');

  // Archive Client 3 -> Active count becomes 2/3 (1 archived)
  const archivedC3 = await clientService.updateClient(
    workspaceId,
    c3.id,
    { status: 'archived' },
    undefined,
    'free'
  );
  assert(archivedC3.status === 'archived', 'Client 3 archived (Active count now 2/3)');

  // Now with 2 active clients, creating a new client should be ALLOWED (3/3 active)
  const c4 = await clientService.createClient(workspaceId, 'free', {
    name: 'Client 4',
    company_name: 'Epsilon Tech',
    email: 'epsilon@example.com',
  });
  assert(c4.status === 'active', 'Client 4 created while 1 client is archived (Active: 3/3, Total: 4)');

  // Now active clients = 3 (c1, c2, c4) and archived = 1 (c3).
  // Attempting to reactivate c3 MUST BE BLOCKED (would make 4 active on Free plan)
  let reactivationBlocked = false;
  let reactivationError = '';
  try {
    await clientService.updateClient(
      workspaceId,
      c3.id,
      { status: 'active' },
      undefined,
      'free'
    );
  } catch (err: any) {
    reactivationBlocked = true;
    reactivationError = err.message;
  }
  assert(
    reactivationBlocked && reactivationError.includes('limit reached'),
    'Reactivating archived client at capacity (3 active) is strictly blocked',
    `Error was: ${reactivationError}`
  );

  // Updating non-status fields (e.g. notes, company_name) on an active client at limit is ALLOWED
  const updatedC1 = await clientService.updateClient(
    workspaceId,
    c1.id,
    { notes: 'Updated accounting notes' },
    undefined,
    'free'
  );
  assert(updatedC1.notes === 'Updated accounting notes', 'Editing details of active client at limit is permitted');

  // Updating non-status fields on an archived client is ALLOWED
  const updatedArchivedC3 = await clientService.updateClient(
    workspaceId,
    c3.id,
    { notes: 'Archived notes updated' },
    undefined,
    'free'
  );
  assert(updatedArchivedC3.notes === 'Archived notes updated', 'Editing details of archived client is permitted');

  // Archive Client 1 -> Active count becomes 2 (c2, c4 active; c1, c3 archived)
  await clientService.updateClient(workspaceId, c1.id, { status: 'archived' }, undefined, 'free');

  // Now reactivating c3 is ALLOWED (Active count becomes 3/3)
  const reactivatedC3 = await clientService.updateClient(
    workspaceId,
    c3.id,
    { status: 'active' },
    undefined,
    'free'
  );
  assert(reactivatedC3.status === 'active', 'Reactivating client when quota is available (2 active) succeeds');

  // -------------------------------------------------------------
  // TEST GROUP 3: Downgrade Data Retention & Quota Safety
  // -------------------------------------------------------------
  console.log('\n📌 Test Group 3: Downgrade Data Retention & Quota Safety');

  // Simulate Pro workspace with 10 clients
  const proWorkspaceId = 'ws_pro_' + Math.random().toString(36).substring(2, 7);
  for (let i = 1; i <= 6; i++) {
    await clientService.createClient(proWorkspaceId, 'pro', {
      name: `Pro Client ${i}`,
      company_name: `Pro Enterprise ${i}`,
      email: `pro${i}@enterprise.com`,
    });
  }
  const proClients = await clientService.getClients(proWorkspaceId);
  assert(proClients.length === 6, 'Created 6 clients on Pro plan');

  // Downgrade workspace to Free plan (Free limit = 3 clients)
  // 1. Existing 6 clients MUST remain fully retained and queryable
  const downgradedClients = await clientService.getClients(proWorkspaceId);
  assert(downgradedClients.length === 6, 'All 6 existing clients remain retained after downgrade');

  // 2. Creating a 7th client on downgraded Free plan MUST be blocked (6 >= 3 limit)
  let postDowngradeBlocked = false;
  try {
    await clientService.createClient(proWorkspaceId, 'free', {
      name: 'Client 7',
      company_name: 'Blocked Post Downgrade',
      email: 'blocked@example.com',
    });
  } catch (err) {
    postDowngradeBlocked = true;
  }
  assert(postDowngradeBlocked, 'Creating new clients is blocked when existing count exceeds downgraded limit');

  // -------------------------------------------------------------
  // TEST GROUP 4: Plan Entitlements & AI Feature Gate
  // -------------------------------------------------------------
  console.log('\n📌 Test Group 4: Plan Entitlements & AI Feature Gate');

  const freeLimits = billingService.getPlanLimits('free');
  assert(freeLimits.maxClients === 3, 'Free tier has max 3 clients');
  assert(freeLimits.allowAiChecklist === false, 'Free tier has AI Checklist disabled');
  assert(freeLimits.allowAiDocAssistance === false, 'Free tier has AI Doc Assistance disabled');

  const starterLimits = billingService.getPlanLimits('starter');
  assert(starterLimits.maxClients === 15, 'Starter tier has max 15 clients');
  assert(starterLimits.allowAiChecklist === true, 'Starter tier has AI Checklist enabled');
  assert(starterLimits.allowAiDocAssistance === false, 'Starter tier has AI Doc Assistance disabled');

  const proLimits = billingService.getPlanLimits('pro');
  assert(proLimits.maxClients === 100, 'Pro tier has max 100 clients');
  assert(proLimits.allowAiChecklist === true, 'Pro tier has AI Checklist enabled');
  assert(proLimits.allowAiDocAssistance === true, 'Pro tier has AI Doc Assistance enabled');

  // Feature gate checks
  const freeAiGate = billingService.checkAiFeatureAllowed('free', 'checklist');
  assert(freeAiGate.allowed === false, 'Free plan AI checklist access is denied');

  const starterAiGate = billingService.checkAiFeatureAllowed('starter', 'checklist');
  assert(starterAiGate.allowed === true, 'Starter plan AI checklist access is permitted');

  const starterDocGate = billingService.checkAiFeatureAllowed('starter', 'doc_assistance');
  assert(starterDocGate.allowed === false, 'Starter plan AI doc assistance is denied (Pro only)');

  const proDocGate = billingService.checkAiFeatureAllowed('pro', 'doc_assistance');
  assert(proDocGate.allowed === true, 'Pro plan AI doc assistance is permitted');

  // -------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`📊 Billing & Quota Test Results: ${stats.passed}/${stats.total} Passed (${stats.failed} Failed)`);
  console.log('====================================================');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runBillingQuotaTests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
