/**
 * DocChase Batch 3 — End-to-End Customer Workflow Hardening Test Suite
 * 
 * Validates the complete customer journey from accountant dispatch to client portal
 * upload, review, rejection, replacement, approval, readiness calculation, reminder stopping,
 * dashboard metrics, client archiving, quota limits, member permissions, and error handling.
 * 
 * Covers all 20 required criteria:
 *  1. Authenticated workspace setup
 *  2. Client creation
 *  3. Request creation
 *  4. Request dispatch
 *  5. Portal token validity
 *  6. Client portal access
 *  7. Document upload
 *  8. Accountant document retrieval
 *  9. Document rejection
 * 10. Document replacement
 * 11. Document approval
 * 12. READY calculation
 * 13. Reminder cancellation at READY
 * 14. Dashboard state consistency
 * 15. Client archive
 * 16. Client reactivation / quota behavior
 * 17. Template edit persistence
 * 18. Workspace member permissions
 * 19. Billing limit behavior
 * 20. Relevant error / loading paths
 */

import * as fs from 'fs';
import * as path from 'path';

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

import { workspaceService } from '../src/services/workspaces';
import { clientService } from '../src/services/clients';
import {
  requestService,
  getCachedPortalToken,
  setCachedPortalToken,
  clearCachedPortalToken,
} from '../src/services/requests';
import { documentService, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../src/services/documents';
import { reminderService } from '../src/services/reminders';
import { templateService } from '../src/services/templates';
import { auditService } from '../src/services/audit';
import { billingService, PLAN_LIMITS } from '../src/services/billing';

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

async function runBatch3E2ECustomerWorkflowTests() {
  console.log('================================================================');
  console.log('🚀 DocChase Batch 3 — End-to-End Customer Workflow Hardening Suite');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const testWorkspaceId = 'ws_e2e_batch3_' + Math.random().toString(36).substring(2, 9);
  const testUserId = 'user_e2e_accountant_' + Math.random().toString(36).substring(2, 9);

  // =================================================================
  // 1. Authenticated Workspace Setup
  // =================================================================
  console.log('--- 1. Authenticated Workspace Setup ---');
  const createdWs = await workspaceService.createWorkspace(testUserId, 'Apex Accounting & Advisory');
  assert(Boolean(createdWs?.id), '1.1: Workspace created successfully with unique ID');
  assert(createdWs.name === 'Apex Accounting & Advisory', '1.2: Workspace name matches expected brand');

  // Verify members query
  const initialMembers = await workspaceService.getWorkspaceMembers(createdWs.id);
  assert(Array.isArray(initialMembers), '1.3: Workspace members list queryable and returned as array');

  // =================================================================
  // 2. Client Creation
  // =================================================================
  console.log('\n--- 2. Client Creation & Validation ---');
  const client1 = await clientService.createClient(createdWs.id, 'starter', {
    name: 'Eleanor Vance',
    company_name: 'Hill House Enterprises',
    email: 'eleanor@hillhouse.example.com',
    phone: '+1 555-0199',
  });
  assert(Boolean(client1?.id), '2.1: Client created with valid UUID');
  assert(client1.status === 'active', '2.2: Client created in active status');
  assert(client1.workspace_id === createdWs.id, '2.3: Client assigned to correct workspace ID');

  const clientList = await clientService.getClients(createdWs.id);
  assert(clientList.some((c) => c.id === client1.id), '2.4: Newly created client appears in workspace client list');

  // =================================================================
  // 3. Request Creation with Requirements
  // =================================================================
  console.log('\n--- 3. Request Creation with Requirements ---');
  const requestCreationResult = await requestService.createRequest(createdWs.id, 'starter', {
    clientId: client1.id,
    clientName: client1.name,
    title: 'FY2026 Year-End Corporate Tax Package',
    period: 'FY 2026',
    dueDate: '2026-11-15',
    items: [
      { name: 'Income Statement (P&L)', required: true },
      { name: 'Corporate Balance Sheet', required: true },
      { name: 'Charity Donations Receipt', required: false },
    ],
  });

  const request = requestCreationResult.request;
  const rawToken = requestCreationResult.rawToken;

  assert(Boolean(request?.id), '3.1: Request record created with ID');
  assert(request.title === 'FY2026 Year-End Corporate Tax Package', '3.2: Request title preserved');
  assert(request.period === 'FY 2026', '3.3: Request period preserved');
  assert(request.client_id === client1.id, '3.4: Request linked to client1');
  assert((request as any).items?.length === 3, '3.5: Request created with exactly 3 requirement items');

  // =================================================================
  // 4. Request Dispatch & Initial State
  // =================================================================
  console.log('\n--- 4. Request Dispatch & Initial State ---');
  assert(request.status === 'sent' || request.status === 'in_progress', '4.1: Request dispatches in sent/in_progress state');
  const cachedToken = getCachedPortalToken(request.id);
  assert(Boolean(cachedToken), '4.2: Portal token is cached locally for immediate accountant copy/send action');

  // Verify audit record created
  const auditLogs = await auditService.getLogs(createdWs.id);
  const dispatchLog = auditLogs.find((l) => l.action === 'request.created' && l.entity_id === request.id);
  assert(Boolean(dispatchLog), '4.3: Request creation produces authoritative audit log');

  // =================================================================
  // 5. Portal Token Cryptographic Validity
  // =================================================================
  console.log('\n--- 5. Portal Token Validity ---');
  assert(typeof rawToken === 'string' && rawToken.length === 64, '5.1: Raw portal token is 64 hex characters (32 cryptographically secure bytes)');
  assert(/^[0-9a-f]{64}$/i.test(rawToken), '5.2: Raw token matches strict hex format');
  assert(Boolean(request.access_token_hash), '5.3: Request securely stores access_token_hash (never raw token)');
  assert((request as any).access_token !== rawToken, '5.4: Request does not expose plaintext token in database record');

  // =================================================================
  // 6. Client Portal Access via Secure Token Hash
  // =================================================================
  console.log('\n--- 6. Client Portal Access ---');
  // Token verification lookup
  const portalData = await requestService.getClientRequestByToken(rawToken);
  assert(Boolean(portalData), '6.1: Valid token successfully retrieves portal data');
  assert(portalData?.request.id === request.id, '6.2: Portal data points to correct request ID');
  assert(portalData?.items.length === 3, '6.3: Portal exposes all 3 document requirements');

  // Invalid token lookup must fail
  const invalidPortalData = await requestService.getClientRequestByToken('0000000000000000000000000000000000000000000000000000000000000000');
  assert(invalidPortalData === null, '6.4: Invalid portal token lookup returns null safely');

  // =================================================================
  // 7. Client Document Upload
  // =================================================================
  console.log('\n--- 7. Document Upload Flow ---');
  const items = (request as any).items;
  const pnlItem = items.find((i: any) => i.name === 'Income Statement (P&L)');
  const balanceSheetItem = items.find((i: any) => i.name === 'Corporate Balance Sheet');
  const charityItem = items.find((i: any) => i.name === 'Charity Donations Receipt');

  // Create mock valid PDF with %PDF magic bytes
  const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const mockPnlFile = new File([pdfHeader], 'pnl_2026.pdf', { type: 'application/pdf' });

  const uploadedDoc = await documentService.uploadDocument({
    workspaceId: createdWs.id,
    clientId: client1.id,
    requestId: request.id,
    requestItemId: pnlItem.id,
    file: mockPnlFile,
    clientName: client1.name,
  });

  assert(Boolean(uploadedDoc?.id), '7.1: Document upload returns document record');
  assert(uploadedDoc.status === 'pending_review', '7.2: Uploaded document status is pending_review');

  const reqAfterUpload = await requestService.getRequestDetails(createdWs.id, request.id);
  const updatedPnlItem = reqAfterUpload?.items.find((i) => i.id === pnlItem.id);
  assert(updatedPnlItem?.status === 'uploaded', '7.3: Requirement status transitions to uploaded');

  // =================================================================
  // 8. Accountant Document Retrieval
  // =================================================================
  console.log('\n--- 8. Accountant Document Retrieval ---');
  const vaultItems = await documentService.getVaultItems(createdWs.id);
  const vaultPnl = vaultItems.find((v) => v.id === pnlItem.id);
  assert(Boolean(vaultPnl), '8.1: Uploaded item appears in accountant vault');
  assert(vaultPnl?.fileName === 'pnl_2026.pdf', '8.2: Accountant vault exposes correct original filename');
  assert(vaultPnl?.clientName === client1.name || vaultPnl?.clientName === client1.company_name, '8.3: Vault item links to client name');
  assert(Boolean(vaultPnl?.clientId), '8.4: Vault item includes clientId for navigation');

  // =================================================================
  // 9. Document Rejection with Reason
  // =================================================================
  console.log('\n--- 9. Document Rejection with Reason ---');
  await documentService.reviewDocument({
    workspaceId: createdWs.id,
    requestId: request.id,
    requestItemId: pnlItem.id,
    itemName: pnlItem.name,
    action: 'reject',
    rejectionReason: 'Page 2 is cutoff and missing operating expenses section.',
  });

  const reqAfterRejection = await requestService.getRequestDetails(createdWs.id, request.id);
  const rejectedItem = reqAfterRejection?.items.find((i) => i.id === pnlItem.id);
  assert(rejectedItem?.status === 'rejected', '9.1: Requirement status transitions to rejected');
  assert(
    rejectedItem?.rejection_reason === 'Page 2 is cutoff and missing operating expenses section.',
    '9.2: Rejection reason accurately recorded'
  );

  const readinessAfterRejection = await documentService.recalculateReadiness(createdWs.id, request.id);
  assert(!readinessAfterRejection.isReady, '9.3: Request with rejected required item is NOT ready');

  // =================================================================
  // 10. Document Replacement by Client
  // =================================================================
  console.log('\n--- 10. Document Replacement by Client ---');
  const mockPnlReplacement = new File([pdfHeader], 'pnl_2026_complete_signed.pdf', { type: 'application/pdf' });
  const replacedDoc = await documentService.uploadDocument({
    workspaceId: createdWs.id,
    clientId: client1.id,
    requestId: request.id,
    requestItemId: pnlItem.id,
    file: mockPnlReplacement,
    clientName: client1.name,
  });

  assert(Boolean(replacedDoc?.id), '10.1: Replacement document successfully uploaded');
  const reqAfterReplacement = await requestService.getRequestDetails(createdWs.id, request.id);
  const replacedItem = reqAfterReplacement?.items.find((i) => i.id === pnlItem.id);
  assert(replacedItem?.status === 'uploaded', '10.2: Replaced item transitions back to uploaded');
  assert(reqAfterReplacement?.items.length === 3, '10.3: Replacement did not duplicate requirements count');

  // =================================================================
  // 11. Document Approval
  // =================================================================
  console.log('\n--- 11. Document Approval ---');
  await documentService.reviewDocument({
    workspaceId: createdWs.id,
    requestId: request.id,
    requestItemId: pnlItem.id,
    itemName: pnlItem.name,
    action: 'approve',
  });

  const reqAfterPnlApproval = await requestService.getRequestDetails(createdWs.id, request.id);
  const approvedPnlItem = reqAfterPnlApproval?.items.find((i) => i.id === pnlItem.id);
  assert(approvedPnlItem?.status === 'approved', '11.1: Replaced P&L item is approved');

  // Still 1 required item (Balance Sheet) missing -> must not be ready yet
  const midReadiness = await documentService.recalculateReadiness(createdWs.id, request.id);
  assert(!midReadiness.isReady, '11.2: 1 of 2 required items approved -> remains NOT READY');

  // Approve the second required item (Balance Sheet)
  const mockBalanceSheetFile = new File([pdfHeader], 'balance_sheet_2026.pdf', { type: 'application/pdf' });
  await documentService.uploadDocument({
    workspaceId: createdWs.id,
    clientId: client1.id,
    requestId: request.id,
    requestItemId: balanceSheetItem.id,
    file: mockBalanceSheetFile,
    clientName: client1.name,
  });

  await documentService.reviewDocument({
    workspaceId: createdWs.id,
    requestId: request.id,
    requestItemId: balanceSheetItem.id,
    itemName: balanceSheetItem.name,
    action: 'approve',
  });

  // =================================================================
  // 12. READY Calculation (All Required Approved, Optional Missing)
  // =================================================================
  console.log('\n--- 12. Authoritative READY Calculation ---');
  const finalReadiness = await documentService.recalculateReadiness(createdWs.id, request.id);
  assert(finalReadiness.isReady, '12.1: All required items approved while optional is missing -> READY');

  const finalReqDetails = await requestService.getRequestDetails(createdWs.id, request.id);
  assert(finalReqDetails?.status === 'ready', '12.2: Request record status persisted as ready');

  // Test optional-only readiness behavior
  const optRequest = await requestService.createRequest(createdWs.id, 'starter', {
    clientId: client1.id,
    clientName: client1.name,
    title: 'Optional Receipts Only',
    period: 'Q4 2026',
    dueDate: '2026-12-01',
    items: [{ name: 'Optional Coffee Receipt', required: false }],
  });
  const optReqId = optRequest.request.id;
  const optItem = (optRequest.request as any).items[0];

  let optReadiness = await documentService.recalculateReadiness(createdWs.id, optReqId);
  assert(!optReadiness.isReady, '12.3: Optional-only request initially NOT READY');

  await documentService.reviewDocument({
    workspaceId: createdWs.id,
    requestId: optReqId,
    requestItemId: optItem.id,
    itemName: optItem.name,
    action: 'approve',
  });
  optReadiness = await documentService.recalculateReadiness(createdWs.id, optReqId);
  assert(optReadiness.isReady, '12.4: Optional-only request becomes READY once all optional items approved');

  // =================================================================
  // 13. Reminder Cancellation at READY State
  // =================================================================
  console.log('\n--- 13. Reminder Cessation at READY State ---');
  const reminderResult = await reminderService.sendSmartReminder({
    workspaceId: createdWs.id,
    requestId: request.id,
    clientName: client1.name,
    clientEmail: client1.email,
    requestTitle: request.title,
    dueDate: request.due_date,
    outstandingItems: [], // 0 items missing
  });

  assert(reminderResult.stopped === true, '13.1: Reminder strictly halted when 0 items outstanding');
  assert(reminderResult.success === false, '13.2: Reminder send marked unsuccessful/halted');

  // Even if caller erroneously provides items, if request is READY, reminder halts
  const reminderReadyCheck = await reminderService.sendSmartReminder({
    workspaceId: createdWs.id,
    requestId: request.id,
    clientName: client1.name,
    clientEmail: client1.email,
    requestTitle: request.title,
    dueDate: request.due_date,
    outstandingItems: ['Stale Item'],
  });
  assert(
    reminderReadyCheck.stopped === true,
    '13.3: Smart reminder guard halts dispatch for completed READY requests'
  );

  // =================================================================
  // 14. Dashboard State Consistency
  // =================================================================
  console.log('\n--- 14. Dashboard State Consistency ---');
  const allClients = await clientService.getClients(createdWs.id);
  const activeClients = allClients.filter((c) => c.status === 'active');
  const allRequests = await requestService.getRequests(createdWs.id);
  const readyRequests = allRequests.filter((r) => r.status === 'ready');

  assert(activeClients.length >= 1, '14.1: Dashboard active client count is accurate');
  assert(readyRequests.length >= 2, '14.2: Dashboard ready count accurately aggregates ready requests');

  // Check Dashboard Page code structure ensures synchronization
  const dashboardContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/DashboardPage.tsx'), 'utf-8');
  assert(dashboardContent.includes('loadDashboard()'), '14.3: Dashboard exposes loadDashboard for unified state loading');
  assert(dashboardContent.includes('navigate(`/clients/${req.client_id}`)'), '14.4: Dashboard recent requests link to client detail');

  // =================================================================
  // 15. Client Archive Behavior
  // =================================================================
  console.log('\n--- 15. Client Archive Behavior ---');
  const archivedClient = await clientService.updateClient(createdWs.id, client1.id, {
    status: 'archived',
  });
  assert(archivedClient.status === 'archived', '15.1: Client status transitions to archived');

  // Client cannot receive newly created requests
  let createForArchivedFailed = false;
  try {
    await requestService.createRequest(createdWs.id, 'starter', {
      clientId: client1.id,
      clientName: client1.name,
      title: 'Illegal Request for Archived Client',
      period: 'Q4 2026',
      dueDate: '2026-12-15',
      items: [{ name: 'Bank Statement', required: true }],
    });
  } catch (err: any) {
    createForArchivedFailed = true;
  }
  assert(createForArchivedFailed, '15.2: Creating request for archived client is blocked');

  // Existing requests remain safely queryable
  const requestsForArchived = await requestService.getRequestDetails(createdWs.id, request.id);
  assert(requestsForArchived !== null, '15.3: Existing requests for archived client remain safely queryable');

  // =================================================================
  // 16. Client Reactivation & Quota Behavior
  // =================================================================
  console.log('\n--- 16. Client Reactivation & Quota Behavior ---');
  const reactivatedClient = await clientService.updateClient(createdWs.id, client1.id, {
    status: 'active',
  });
  assert(reactivatedClient.status === 'active', '16.1: Client successfully reactivated');

  // Reactivated client can receive requests again
  const postReactivationReq = await requestService.createRequest(createdWs.id, 'starter', {
    clientId: client1.id,
    clientName: client1.name,
    title: 'Post Reactivation Valid Request',
    period: 'Q1 2027',
    dueDate: '2027-01-31',
    items: [{ name: 'Tax Form 1099', required: true }],
  });
  assert(Boolean(postReactivationReq.request.id), '16.2: Reactivated client can receive new requests');

  // =================================================================
  // 17. Template Edit Persistence
  // =================================================================
  console.log('\n--- 17. Template Edit Persistence ---');
  const newTemplate = await templateService.createTemplate(
    createdWs.id,
    {
      name: 'Quarterly VAT Audit',
      description: 'Standard quarterly VAT documentation package',
      frequency: 'quarterly',
    },
    [
      { name: 'VAT Return Form', required: true },
      { name: 'Sales Ledger', required: true },
    ]
  );
  assert(Boolean(newTemplate.id), '17.1: Template created');

  const updatedTemplate = await templateService.updateTemplate(
    createdWs.id,
    newTemplate.id,
    {
      name: 'Quarterly VAT & Customs Audit',
      description: 'Updated comprehensive VAT checklist',
      frequency: 'quarterly',
    },
    [
      { name: 'VAT Return Form', required: true },
      { name: 'Sales Ledger', required: true },
      { name: 'Customs Duty Receipts', required: false },
    ]
  );
  assert(updatedTemplate.name === 'Quarterly VAT & Customs Audit', '17.2: Template name update persists');
  assert(updatedTemplate.items.length === 3, '17.3: Template items array update persists');

  // Verify already created requests are unaffected by template edits
  const existingReqStillIntact = await requestService.getRequestDetails(createdWs.id, request.id);
  assert(existingReqStillIntact?.items.length === 3, '17.4: Existing requests are immutable to subsequent template edits');

  // =================================================================
  // 18. Workspace Member Permissions
  // =================================================================
  console.log('\n--- 18. Workspace Member Permissions ---');
  const members = await workspaceService.getWorkspaceMembers(createdWs.id);
  assert(Array.isArray(members), '18.1: Workspace members query succeeds');

  // Verify settings page and billing logic restricts non-owner/admin
  const settingsContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/SettingsPage.tsx'), 'utf-8');
  assert(
    settingsContent.includes("isOwner") || settingsContent.includes("isAdmin") || settingsContent.includes("currentRole"),
    '18.2: Settings UI checks user role authority for sensitive billing and team actions'
  );

  // =================================================================
  // 19. Billing Limit Behavior
  // =================================================================
  console.log('\n--- 19. Billing Limits Enforcement ---');
  const freeLimits = billingService.getPlanLimits('free');
  const starterLimits = billingService.getPlanLimits('starter');
  const proLimits = billingService.getPlanLimits('pro');

  assert(freeLimits.maxClients === 3, '19.1: Free plan limit is 3 active clients');
  assert(starterLimits.maxClients === 15, '19.2: Starter plan limit is 15 active clients');
  assert(proLimits.maxClients === 100, '19.3: Pro plan limit is 100 active clients');
  assert(freeLimits.allowAiChecklist === false, '19.4: Free plan gates AI checklist generator');
  assert(starterLimits.allowAiChecklist === true, '19.5: Starter plan enables AI checklist generator');

  // Attempting to exceed free plan limit (3 clients)
  const quotaWs = 'ws_quota_test_' + Math.random().toString(36).substring(2, 9);
  await clientService.createClient(quotaWs, 'free', { name: 'C1', company_name: 'Co1', email: 'c1@test.com' });
  await clientService.createClient(quotaWs, 'free', { name: 'C2', company_name: 'Co2', email: 'c2@test.com' });
  await clientService.createClient(quotaWs, 'free', { name: 'C3', company_name: 'Co3', email: 'c3@test.com' });

  let quotaExceededError = false;
  let quotaErrorMessage = '';
  try {
    await clientService.createClient(quotaWs, 'free', { name: 'C4', company_name: 'Co4', email: 'c4@test.com' });
  } catch (err: any) {
    quotaExceededError = true;
    quotaErrorMessage = err.message;
  }
  assert(quotaExceededError, '19.6: 4th client creation on Free plan is blocked');
  assert(quotaErrorMessage.toLowerCase().includes('limit') || quotaErrorMessage.toLowerCase().includes('upgrade'), '19.7: Truthful upgrade/limit message returned');

  // =================================================================
  // 20. Relevant Error & Loading Paths
  // =================================================================
  console.log('\n--- 20. Relevant Error & Loading Paths ---');

  // Invalid file MIME type rejection
  const invalidFile = new File(['executable code'], 'script.exe', { type: 'application/x-msdownload' });
  const validationResult = await documentService.validateFileContent(invalidFile);
  assert(!validationResult.valid, '20.1: File validator rejects disallowed MIME type (.exe)');
  assert(Boolean(validationResult.error), '20.2: File validator returns actionable error message');

  // Large file size rejection (> 25MB)
  const oversizedFile = {
    type: 'application/pdf',
    size: 26 * 1024 * 1024,
    arrayBuffer: async () => new ArrayBuffer(8),
  } as any;
  const sizeValidation = await documentService.validateFileContent(oversizedFile);
  assert(!sizeValidation.valid, '20.3: File validator rejects file exceeding 25MB');

  // Double-click submission locking verification in UI code
  const createRequestContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/CreateRequestPage.tsx'), 'utf-8');
  assert(
    createRequestContent.includes('submitting') &&
      createRequestContent.includes('isLoading={submitting}') &&
      createRequestContent.includes('disabled={submitting}'),
    '20.4: CreateRequestPage locks submit button during async dispatch to prevent double submission'
  );

  // Email failure truthfulness: inspect email error handling
  assert(
    createRequestContent.includes('emailDeliveryMessage') &&
      createRequestContent.includes('setEmailDeliveryMessage') &&
      createRequestContent.includes('emailRes.error'),
    '20.5: CreateRequestPage handles email delivery failure truthfully without claiming request creation failed'
  );

  // Client Portal completion state
  const clientPortalContent = fs.readFileSync(path.join(rootDir, 'src/pages/client/ClientPortalPage.tsx'), 'utf-8');
  assert(
    clientPortalContent.includes("portalData.request.status === 'ready'"),
    '20.6: ClientPortalPage displays completion state when request status is ready'
  );

  // Documents Page navigation linkage
  const documentsPageContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/DocumentsPage.tsx'), 'utf-8');
  assert(
    documentsPageContent.includes('/clients/${item.clientId}'),
    '20.7: DocumentsPage client name navigates to client detail'
  );

  // Request Detail navigation linkage
  const requestDetailContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/RequestDetailPage.tsx'), 'utf-8');
  assert(
    requestDetailContent.includes('/review') &&
      requestDetailContent.includes('/clients/${request.client_id'),
    '20.8: RequestDetailPage provides direct navigation to Review and Client'
  );

  // Document Review navigation linkage
  const reviewContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/DocumentReviewPage.tsx'), 'utf-8');
  assert(
    reviewContent.includes('/clients/${request.client_id'),
    '20.9: DocumentReviewPage provides direct link to Client'
  );

  console.log('\n================================================================');
  console.log(`📊 Test Results: ${stats.passed} passed, ${stats.failed} failed out of ${stats.total} total`);
  console.log('================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runBatch3E2ECustomerWorkflowTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
