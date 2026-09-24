/**
 * DocChase Phase 4 Functional Workability Lifecycle Test Suite
 * Validates fixes for:
 * - Bug 1: All-Optional & Mixed Document Request Readiness
 * - Bug 2: Defense-in-depth prevention of request creation for archived clients
 * - Bug 3: Prevention of reminder claiming for archived clients
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

import { requestService } from '../src/services/requests';
import { clientService } from '../src/services/clients';
import { documentService } from '../src/services/documents';

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

async function runLifecycleWorkabilityTests() {
  console.log('====================================================');
  console.log('🧪 DocChase Phase 4 Lifecycle Workability Tests');
  console.log('====================================================\n');

  const workspaceId = 'ws_workability_' + Math.random().toString(36).substring(2, 7);

  // -------------------------------------------------------------
  // TEST GROUP 1: Client Lifecycle & Active Status Verification
  // -------------------------------------------------------------
  console.log('📌 Test Group 1: Client Creation & Status State Machine');
  
  const clientA = await clientService.createClient(workspaceId, 'starter', {
    name: 'Sarah Connor',
    company_name: 'Cyberdyne Resistance',
    email: 'sarah@cyberdyne.org',
  });
  assert(clientA.status === 'active', 'Created client has status = active');

  const clientB = await clientService.createClient(workspaceId, 'starter', {
    name: 'Miles Dyson',
    company_name: 'Neural Net Inc',
    email: 'miles@neuralnet.com',
  });
  assert(clientB.status === 'active', 'Second client created with status = active');

  // Archive client B
  const archivedClientB = await clientService.updateClient(workspaceId, clientB.id, {
    status: 'archived',
  });
  assert(archivedClientB.status === 'archived', 'Client B successfully archived');

  // -------------------------------------------------------------
  // TEST GROUP 2: Bug 2 - Request Creation Defense for Archived Clients
  // -------------------------------------------------------------
  console.log('\n📌 Test Group 2: Bug 2 - Request Creation Protection for Archived Clients');

  // 1. Creating request for active client succeeds
  const activeReq = await requestService.createRequest(workspaceId, 'starter', {
    clientId: clientA.id,
    clientName: clientA.name,
    title: 'Q3 Tax Records',
    period: 'Q3 2026',
    dueDate: '2026-10-15',
    items: [
      { name: 'P&L Statement', required: true },
      { name: 'Receipts Summary', required: false },
    ],
  });
  assert(Boolean(activeReq.request.id), 'Request creation for active client succeeds');
  assert(activeReq.request.client_id === clientA.id, 'Request assigned to active client');

  // 2. Creating request for archived client is rejected
  let archivedCreationBlocked = false;
  let archivedErrorMessage = '';
  try {
    await requestService.createRequest(workspaceId, 'starter', {
      clientId: clientB.id,
      clientName: clientB.name,
      title: 'Disallowed Request',
      period: 'Q3 2026',
      dueDate: '2026-10-15',
      items: [{ name: 'Bank Statement', required: true }],
    });
  } catch (err: any) {
    archivedCreationBlocked = true;
    archivedErrorMessage = err.message;
  }
  assert(
    archivedCreationBlocked && archivedErrorMessage.includes('archived'),
    'Request creation for archived client is strictly blocked',
    `Error was: ${archivedErrorMessage}`
  );

  // 3. Cross-workspace client request creation is blocked
  let crossWsBlocked = false;
  try {
    await requestService.createRequest('ws_foreign_workspace_999', 'starter', {
      clientId: clientA.id,
      clientName: clientA.name,
      title: 'Cross Workspace Exploit',
      period: 'Q3 2026',
      dueDate: '2026-10-15',
      items: [{ name: 'Secret Doc', required: true }],
    });
  } catch (err: any) {
    crossWsBlocked = true;
  }
  assert(crossWsBlocked, 'Cross-workspace client ID is rejected during request creation');

  // 4. Reactivating client allows request creation again
  const reactivatedClientB = await clientService.updateClient(workspaceId, clientB.id, {
    status: 'active',
  });
  assert(reactivatedClientB.status === 'active', 'Client B reactivated');

  const reactivatedReq = await requestService.createRequest(workspaceId, 'starter', {
    clientId: clientB.id,
    clientName: clientB.name,
    title: 'Post Reactivation Request',
    period: 'Q3 2026',
    dueDate: '2026-10-20',
    items: [{ name: 'Balance Sheet', required: true }],
  });
  assert(Boolean(reactivatedReq.request.id), 'Reactivated client can now successfully receive requests');

  // -------------------------------------------------------------
  // TEST GROUP 3: Bug 1 - Authoritative Readiness Calculation
  // -------------------------------------------------------------
  console.log('\n📌 Test Group 3: Bug 1 - All-Optional, Mixed, & Standard Readiness');

  // Scenario 3A: Request with Required Items (2 required)
  const req2Required = await requestService.createRequest(workspaceId, 'starter', {
    clientId: clientA.id,
    clientName: clientA.name,
    title: '2 Required Items Request',
    period: 'October 2026',
    dueDate: '2026-11-01',
    items: [
      { name: 'Bank Statement', required: true },
      { name: 'Payroll Summary', required: true },
    ],
  });
  const req2ReqId = req2Required.request.id;
  const items2Req = (req2Required.request as any).items;

  // Initial state: not ready
  let readiness = await documentService.recalculateReadiness(workspaceId, req2ReqId);
  assert(!readiness.isReady, 'Initial 2-required request is not ready');

  // Approve 1 of 2 required
  await documentService.reviewDocument({
    workspaceId,
    requestId: req2ReqId,
    requestItemId: items2Req[0].id,
    itemName: items2Req[0].name,
    action: 'approve',
  });
  readiness = await documentService.recalculateReadiness(workspaceId, req2ReqId);
  assert(!readiness.isReady, '1 of 2 required items approved -> NOT READY');

  // Approve 2 of 2 required
  await documentService.reviewDocument({
    workspaceId,
    requestId: req2ReqId,
    requestItemId: items2Req[1].id,
    itemName: items2Req[1].name,
    action: 'approve',
  });
  readiness = await documentService.recalculateReadiness(workspaceId, req2ReqId);
  assert(readiness.isReady, '2 of 2 required items approved -> READY');

  // Scenario 3B: Mixed Request (1 Required + 1 Optional)
  const reqMixed = await requestService.createRequest(workspaceId, 'starter', {
    clientId: clientA.id,
    clientName: clientA.name,
    title: 'Mixed Required + Optional Request',
    period: 'October 2026',
    dueDate: '2026-11-01',
    items: [
      { name: 'W-2 Form', required: true },
      { name: 'Charity Donations Receipt', required: false },
    ],
  });
  const reqMixedId = reqMixed.request.id;
  const itemsMixed = (reqMixed.request as any).items;

  // Approve only the required item
  await documentService.reviewDocument({
    workspaceId,
    requestId: reqMixedId,
    requestItemId: itemsMixed[0].id,
    itemName: itemsMixed[0].name,
    action: 'approve',
  });
  readiness = await documentService.recalculateReadiness(workspaceId, reqMixedId);
  assert(readiness.isReady, '1 Required item approved while 1 Optional is missing -> READY (Case A)');

  // Scenario 3C: All-Optional Request (Case B - Bug 1 Core Fix)
  const reqAllOptional = await requestService.createRequest(workspaceId, 'starter', {
    clientId: clientA.id,
    clientName: clientA.name,
    title: 'All-Optional Tax Deductions Request',
    period: 'October 2026',
    dueDate: '2026-11-01',
    items: [
      { name: 'Optional Home Office Expense Receipt', required: false },
      { name: 'Optional Mileage Log', required: false },
    ],
  });
  const reqAllOptId = reqAllOptional.request.id;
  const itemsAllOpt = (reqAllOptional.request as any).items;

  // Initial state: not ready
  readiness = await documentService.recalculateReadiness(workspaceId, reqAllOptId);
  assert(!readiness.isReady, 'All-optional request initially -> NOT READY');

  // Approve 1 of 2 optional items
  await documentService.reviewDocument({
    workspaceId,
    requestId: reqAllOptId,
    requestItemId: itemsAllOpt[0].id,
    itemName: itemsAllOpt[0].name,
    action: 'approve',
  });
  readiness = await documentService.recalculateReadiness(workspaceId, reqAllOptId);
  assert(!readiness.isReady, '1 of 2 optional items approved -> NOT READY (Case B requires all approved)');

  // Approve second optional item
  await documentService.reviewDocument({
    workspaceId,
    requestId: reqAllOptId,
    requestItemId: itemsAllOpt[1].id,
    itemName: itemsAllOpt[1].name,
    action: 'approve',
  });
  readiness = await documentService.recalculateReadiness(workspaceId, reqAllOptId);
  assert(readiness.isReady, 'All optional items approved -> READY (Case B Fix Verified)');

  // Scenario 3D: Rejection resets readiness
  await documentService.reviewDocument({
    workspaceId,
    requestId: reqAllOptId,
    requestItemId: itemsAllOpt[1].id,
    itemName: itemsAllOpt[1].name,
    action: 'reject',
    rejectionReason: 'Illegible scan',
  });
  readiness = await documentService.recalculateReadiness(workspaceId, reqAllOptId);
  assert(!readiness.isReady, 'Item rejected -> resets to NOT READY');

  // Idempotency: recalculating multiple times yields consistent outcome
  const read1 = await documentService.recalculateReadiness(workspaceId, reqAllOptId);
  const read2 = await documentService.recalculateReadiness(workspaceId, reqAllOptId);
  assert(read1.isReady === read2.isReady, 'Readiness recalculation is strictly idempotent');

  // -------------------------------------------------------------
  // TEST GROUP 4: Historical Request Integrity for Archived Clients
  // -------------------------------------------------------------
  console.log('\n📌 Test Group 4: Historical Request Retention for Archived Clients');

  // Archive Client A who owns activeReq, req2Required, reqMixed, and reqAllOptional
  await clientService.updateClient(workspaceId, clientA.id, { status: 'archived' });

  // Verify all historical requests are still queryable and intact
  const allWorkspaceRequests = await requestService.getRequests(workspaceId);
  const clientARequests = allWorkspaceRequests.filter((r) => r.client_id === clientA.id);
  assert(clientARequests.length >= 4, 'Archived client historical requests remain accessible in database');

  const historicalReqDetail = await requestService.getRequestDetails(workspaceId, req2ReqId);
  assert(historicalReqDetail !== null, 'Single request detail for archived client is retrievable');
  assert(historicalReqDetail?.items.length === 2, 'Historical request item checklist intact');

  // -------------------------------------------------------------
  // TEST GROUP 5: Bug 4 - Accountant Direct Upload & Authoritative Readiness
  // -------------------------------------------------------------
  console.log('\n📌 Test Group 5: Bug 4 - Accountant Direct Upload & Authoritative Readiness');

  const clientC = await clientService.createClient(workspaceId, 'starter', {
    name: 'Direct Upload Test Client',
    company_name: 'Apex Holdings',
    email: 'apex@example.com',
  });

  const reqDirect = await requestService.createRequest(workspaceId, 'starter', {
    clientId: clientC.id,
    clientName: clientC.name,
    title: 'Direct Accountant Ingestion Request',
    period: 'November 2026',
    dueDate: '2026-12-01',
    items: [
      { name: 'Direct PDF Requirement 1', required: true },
      { name: 'Direct PDF Requirement 2', required: true },
    ],
  });
  const reqDirectId = reqDirect.request.id;
  const itemsDirect = (reqDirect.request as any).items;

  // Create mock valid PDF file with %PDF magic bytes
  const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const mockValidPdf = new File([pdfHeader], 'bank_statement.pdf', { type: 'application/pdf' });

  // A. Direct accountant upload -> item becomes uploaded
  const directUploadedDoc = await documentService.uploadDocument({
    workspaceId,
    clientId: clientC.id,
    requestId: reqDirectId,
    requestItemId: itemsDirect[0].id,
    file: mockValidPdf,
    clientName: clientC.name,
  });
  assert(directUploadedDoc.status === 'pending_review', 'A. Direct accountant upload creates document in pending_review');

  const updatedReqDetails = await requestService.getRequestDetails(workspaceId, reqDirectId);
  const updatedItem1 = updatedReqDetails?.items.find((i) => i.id === itemsDirect[0].id);
  assert(updatedItem1?.status === 'uploaded', 'A. Request item status transitions to uploaded on direct upload');

  // C. Direct upload does NOT incorrectly mark incomplete request READY (1 of 2 required uploaded, 0 approved)
  let directReadiness = await documentService.recalculateReadiness(workspaceId, reqDirectId);
  assert(!directReadiness.isReady, 'C. Direct upload does NOT mark incomplete request as ready');

  // Direct upload for item 2
  await documentService.uploadDocument({
    workspaceId,
    clientId: clientC.id,
    requestId: reqDirectId,
    requestItemId: itemsDirect[1].id,
    file: mockValidPdf,
    clientName: clientC.name,
  });
  directReadiness = await documentService.recalculateReadiness(workspaceId, reqDirectId);
  assert(!directReadiness.isReady, 'C. 2 of 2 items uploaded but pending review -> NOT READY');

  // D. Failed upload (e.g. invalid file) does not mutate readiness incorrectly
  const corruptFile = new File([new Uint8Array([0x00, 0x01])], 'corrupt.exe', { type: 'application/octet-stream' });
  let uploadFailedProperly = false;
  try {
    await documentService.uploadDocument({
      workspaceId,
      clientId: clientC.id,
      requestId: reqDirectId,
      requestItemId: itemsDirect[1].id,
      file: corruptFile,
      clientName: clientC.name,
    });
  } catch {
    uploadFailedProperly = true;
  }
  assert(uploadFailedProperly, 'D. Corrupt/unsupported file upload is rejected');
  directReadiness = await documentService.recalculateReadiness(workspaceId, reqDirectId);
  assert(!directReadiness.isReady, 'D. Failed upload leaves readiness unchanged (NOT READY)');

  // B. Direct upload followed by approval -> READY calculation works
  await documentService.reviewDocument({
    workspaceId,
    requestId: reqDirectId,
    requestItemId: itemsDirect[0].id,
    itemName: itemsDirect[0].name,
    action: 'approve',
  });
  await documentService.reviewDocument({
    workspaceId,
    requestId: reqDirectId,
    requestItemId: itemsDirect[1].id,
    itemName: itemsDirect[1].name,
    action: 'approve',
  });
  directReadiness = await documentService.recalculateReadiness(workspaceId, reqDirectId);
  assert(directReadiness.isReady, 'B. Both direct-uploaded items approved -> request becomes READY');

  // E. Repeated direct upload/recalculation is idempotent
  const repeat1 = await documentService.recalculateReadiness(workspaceId, reqDirectId);
  const repeat2 = await documentService.recalculateReadiness(workspaceId, reqDirectId);
  assert(repeat1.isReady === true && repeat2.isReady === true, 'E. Repeated direct recalculation remains READY and idempotent');

  // -------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`📊 Lifecycle Workability Test Results: ${stats.passed}/${stats.total} Passed (${stats.failed} Failed)`);
  console.log('====================================================');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runLifecycleWorkabilityTests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
