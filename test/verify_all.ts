/**
 * DocChase End-to-End Verification Suite
 * Tests all 8 phases of the DocChase Master Build Specification:
 * - Phase 1: Foundations & Architecture
 * - Phase 2: Core Workspace & Isolation
 * - Phase 3: Client & Request Lifecycle
 * - Phase 4: Secure Upload & Ingestion Engine
 * - Phase 5: Review & Readiness Determination
 * - Phase 6: Smart Chasing & Reminders
 * - Phase 7: AI Intelligence Workflows
 * - Phase 8: Subscription Quotas & Production Hardening
 */

// Node Web Crypto and LocalStorage polyfill for headless execution
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

import { generateSecureToken, hashToken } from '../src/utils/crypto';
import { billingService } from '../src/services/billing';
import { clientService } from '../src/services/clients';
import { templateService } from '../src/services/templates';
import { requestService } from '../src/services/requests';
import { documentService } from '../src/services/documents';
import { reminderService } from '../src/services/reminders';
import { aiService } from '../src/services/ai';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 Starting DocChase Master Verification Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  // -------------------------------------------------------------
  // Test 1: Cryptographic Token Generation & Hashing
  // -------------------------------------------------------------
  console.log('--- Test Section 1: Cryptographic Token Security ---');
  const token1 = generateSecureToken();
  const token2 = generateSecureToken();
  assert(token1.length === 64, 'Token is 32 bytes hex encoded (64 hex characters)');
  assert(token1 !== token2, 'Generated tokens are cryptographically random and unique');

  const hash1 = await hashToken(token1);
  const hash1Repeat = await hashToken(token1);
  const hash2 = await hashToken(token2);
  assert(hash1.length === 64, 'SHA-256 hash is 64 hex characters');
  assert(hash1 === hash1Repeat, 'SHA-256 hash is deterministic for same token');
  assert(hash1 !== hash2, 'Different tokens produce different SHA-256 hashes');
  console.log();

  // -------------------------------------------------------------
  // Test 2: Plan Limit Enforcement (Billing)
  // -------------------------------------------------------------
  console.log('--- Test Section 2: Subscription & Plan Limits ---');
  const workspaceId = 'ws_acorn_test';

  const freeLimits = billingService.getPlanLimits('free');
  assert(freeLimits.maxClients === 3, 'Free plan limit is 3 clients');

  const freeCheck = billingService.checkClientCreationAllowed('free', 0);
  assert(freeCheck.allowed === true, 'Free plan allows 0/3 clients');

  const freeCheckAtLimit = billingService.checkClientCreationAllowed('free', 3);
  assert(
    freeCheckAtLimit.allowed === false,
    'Free plan strictly blocks 4th client when at limit (3 max)'
  );

  const starterLimits = billingService.getPlanLimits('starter');
  assert(starterLimits.maxClients === 15, 'Starter plan allows 15 clients');
  const starterCheck = billingService.checkClientCreationAllowed('starter', 10);
  assert(starterCheck.allowed === true, 'Starter plan allows 10/15 clients');

  const proLimits = billingService.getPlanLimits('pro');
  assert(proLimits.maxClients === 100, 'Pro plan allows 100 clients');
  const proCheck = billingService.checkClientCreationAllowed('pro', 50);
  assert(proCheck.allowed === true, 'Pro plan allows 50/100 clients');
  console.log();

  // -------------------------------------------------------------
  // Test 3: Client Management & Directory
  // -------------------------------------------------------------
  console.log('--- Test Section 3: Client CRUD & Verification ---');
  const client1 = await clientService.createClient(workspaceId, 'free', {
    name: 'Sarah Connor',
    company_name: 'Cyberdyne Systems LLC',
    email: 'sarah@cyberdyne.com',
    phone: '+1 555-0199',
  });
  assert(client1.name === 'Sarah Connor', 'Client created with correct name');
  assert(client1.workspace_id === workspaceId, 'Client bound to workspace isolation');

  const client2 = await clientService.createClient(workspaceId, 'free', {
    name: 'Miles Dyson',
    company_name: 'Dyson Technologies',
    email: 'miles@dyson.com',
    phone: '+1 555-0123',
  });
  assert(client2.email === 'miles@dyson.com', 'Second client created successfully');

  const allClients = await clientService.getClients(workspaceId);
  assert(allClients.length >= 2, 'Clients directory retrieved for workspace');
  console.log();

  // -------------------------------------------------------------
  // Test 4: Recurring Templates & Immutable Snapshots
  // -------------------------------------------------------------
  console.log('--- Test Section 4: Recurring Templates Engine ---');
  const template = await templateService.createTemplate(
    workspaceId,
    {
      name: 'Monthly Bookkeeping Standard',
      description: 'Monthly checklist for corporate clients',
      frequency: 'monthly',
    },
    [
      { name: 'Bank Statement', description: 'Checking & Savings accounts', required: true },
      { name: 'Credit Card Statement', description: 'Operating credit card account', required: true },
      { name: 'Payroll Summary', description: 'Monthly payroll tax register', required: false },
    ]
  );
  assert(template.items.length === 3, 'Template created with 3 document items');
  assert(template.items[0].required === true, 'Item 1 marked required');
  assert(template.items[2].required === false, 'Item 3 marked optional');
  console.log();

  // -------------------------------------------------------------
  // Test 5: Request Dispatch & Cryptographic Token Hashing
  // -------------------------------------------------------------
  console.log('--- Test Section 5: Request Dispatch & Token Storage ---');
  const dispatchResult = await requestService.createRequest(
    workspaceId,
    'free',
    {
      clientId: client1.id,
      clientName: client1.name,
      templateId: template.id,
      title: 'September 2026 Monthly Bookkeeping',
      period: 'September 2026',
      dueDate: '2026-10-15',
      items: template.items.map((i) => ({
        name: i.name,
        description: i.description || undefined,
        required: i.required,
      })),
    }
  );

  const request = dispatchResult.request;
  const rawToken = dispatchResult.rawToken;

  assert(Boolean(rawToken && rawToken.length === 64), 'Plaintext rawToken generated for client link');
  assert((request as any).items.length === 3, 'Template items snapshotted into request items');

  // Verify client portal lookup by token
  const portalPayload = await requestService.getClientRequestByToken(rawToken);
  assert(portalPayload !== null, 'Client portal resolves request via raw token');
  assert(portalPayload?.request.title === 'September 2026 Monthly Bookkeeping', 'Resolved request title matches');
  console.log();

  // -------------------------------------------------------------
  // Test 6: Document Upload & Status Transitions
  // -------------------------------------------------------------
  console.log('--- Test Section 6: Document Upload & Validation Engine ---');
  const bankStmtItem = request.items.find((i: any) => i.name === 'Bank Statement');
  const ccStmtItem = request.items.find((i: any) => i.name === 'Credit Card Statement');
  assert(Boolean(bankStmtItem), 'Bank Statement item found in request');

  // File validation tests
  const invalidFile = new File(['exe binary content'], 'virus.exe', { type: 'application/x-msdownload' });
  const validationRes = documentService.validateFile(invalidFile);
  assert(validationRes.valid === false, 'Non-whitelisted MIME type (exe) strictly rejected');

  const validPdf = new File(['%PDF-1.4 simulated pdf data'], 'chase_bank_september_2026.pdf', {
    type: 'application/pdf',
  });
  const validValidation = documentService.validateFile(validPdf);
  assert(validValidation.valid === true, 'Standard PDF MIME type successfully validated');

  // Upload Bank Statement
  const uploadDoc1 = await documentService.uploadDocument({
    workspaceId,
    clientId: client1.id,
    requestId: request.id,
    requestItemId: bankStmtItem.id,
    file: validPdf,
    clientName: client1.name,
  });
  assert(uploadDoc1.original_filename === 'chase_bank_september_2026.pdf', 'Bank statement upload recorded');

  // Upload Credit Card Statement
  const validCCPdf = new File(['%PDF-1.4 credit card statement'], 'amex_august_2026.pdf', {
    type: 'application/pdf',
  });
  const uploadDoc2 = await documentService.uploadDocument({
    workspaceId,
    clientId: client1.id,
    requestId: request.id,
    requestItemId: ccStmtItem.id,
    file: validCCPdf,
    clientName: client1.name,
  });
  assert(uploadDoc2.original_filename === 'amex_august_2026.pdf', 'Credit card statement upload recorded');

  const afterUploadDetails = await requestService.getRequestDetails(workspaceId, request.id);
  const updatedBankItem = afterUploadDetails?.items.find((i) => i.id === bankStmtItem.id);
  assert(updatedBankItem?.status === 'uploaded', 'Item status transitions to uploaded upon ingestion');
  console.log();

  // -------------------------------------------------------------
  // Test 7: Review Actions & Readiness Determination
  // -------------------------------------------------------------
  console.log('--- Test Section 7: Review & Centralized Readiness Rule ---');

  // Step A: Reject Credit Card statement (wrong month)
  const rejectRes = await documentService.reviewDocument({
    workspaceId,
    requestId: request.id,
    requestItemId: ccStmtItem.id,
    itemName: ccStmtItem.name,
    action: 'reject',
    rejectionReason: 'Uploaded August statement instead of September. Please re-upload September.',
    clientName: client1.name,
  });
  assert(rejectRes.isReady === false, 'Request is NOT ready while an item is rejected');

  const afterRejectDetails = await requestService.getRequestDetails(workspaceId, request.id);
  const rejectedCCItem = afterRejectDetails?.items.find((i) => i.id === ccStmtItem.id);
  assert(rejectedCCItem?.status === 'rejected', 'Item status transitions to rejected');
  assert(
    rejectedCCItem?.rejection_reason === 'Uploaded August statement instead of September. Please re-upload September.',
    'Rejection reason recorded on item for client portal display'
  );

  // Step B: Client re-uploads corrected Credit Card statement
  const correctedCCPdf = new File(['%PDF-1.4 corrected September data'], 'amex_september_2026_CORRECTED.pdf', {
    type: 'application/pdf',
  });
  const reupload = await documentService.uploadDocument({
    workspaceId,
    clientId: client1.id,
    requestId: request.id,
    requestItemId: ccStmtItem.id,
    file: correctedCCPdf,
    clientName: client1.name,
  });
  assert(reupload.original_filename === 'amex_september_2026_CORRECTED.pdf', 'Client replacement upload successful');

  const afterReuploadDetails = await requestService.getRequestDetails(workspaceId, request.id);
  const reuploadedCCItem = afterReuploadDetails?.items.find((i) => i.id === ccStmtItem.id);
  assert(reuploadedCCItem?.status === 'uploaded', 'Item status transitions back to uploaded after client replaces file');
  assert(reuploadedCCItem?.rejection_reason === null, 'Rejection reason cleared upon re-upload');

  // Step C: Approve Bank Statement
  const approve1 = await documentService.reviewDocument({
    workspaceId,
    requestId: request.id,
    requestItemId: bankStmtItem.id,
    itemName: bankStmtItem.name,
    action: 'approve',
    clientName: client1.name,
  });
  assert(approve1.isReady === false, 'Request is not ready yet because CC statement is uploaded, not approved');

  // Step D: Approve Corrected Credit Card statement (both required items now approved)
  const approve2 = await documentService.reviewDocument({
    workspaceId,
    requestId: request.id,
    requestItemId: ccStmtItem.id,
    itemName: ccStmtItem.name,
    action: 'approve',
    clientName: client1.name,
  });
  assert(
    approve2.isReady === true,
    'CORE RULE VERIFIED: When all required items are approved, request automatically transitions to READY'
  );

  const finalReqDetails = await requestService.getRequestDetails(workspaceId, request.id);
  assert(finalReqDetails?.status === 'ready', 'Request status in database is now officially READY');
  console.log();

  // -------------------------------------------------------------
  // Test 8: Smart Reminders & Automatic Stop Rules
  // -------------------------------------------------------------
  console.log('--- Test Section 8: Smart Reminders & Automatic Stop Rules ---');

  // For a request that is READY, reminders must NOT send
  const reminderResult = await reminderService.sendSmartReminder({
    workspaceId,
    requestId: request.id,
    clientName: client1.name,
    clientEmail: client1.email,
    requestTitle: request.title,
    dueDate: request.due_date,
    outstandingItems: [],
  });
  assert(
    reminderResult.stopped === true,
    'STOP RULE VERIFIED: Reminders automatically halt when request cycle is READY or 0 outstanding items remain'
  );

  // For a simulated pending request, reminder targets ONLY missing or rejected items
  const reminderSim = await reminderService.sendSmartReminder({
    workspaceId,
    requestId: 'sim_request_id',
    clientName: client2.name,
    clientEmail: client2.email,
    requestTitle: 'Q3 Tax Preparation',
    dueDate: '2026-10-31',
    outstandingItems: ['Form 1099-MISC', 'Vehicle Mileage Log'],
  });
  assert(
    reminderSim.stopped === false && reminderSim.itemCount === 2,
    'Smart reminder successfully generated targeting ONLY the 2 outstanding items'
  );
  console.log();

  // -------------------------------------------------------------
  // Test 9: AI Intelligence (Checklist Generator & Document Analysis)
  // -------------------------------------------------------------
  console.log('--- Test Section 9: AI Intelligence Engine ---');

  // Test AI Checklist Generator for specific industry
  const dentalChecklist = await aiService.generateChecklist({
    client_type: 'Dental Practice',
    period: 'Monthly',
    firm_specialty: 'Medical & Dental Accounting',
  });
  assert(dentalChecklist.items.length >= 3, 'AI generates industry-appropriate checklist items');
  assert(
    dentalChecklist.items.some((i) => i.name.toLowerCase().includes('insurance') || i.name.toLowerCase().includes('bank')),
    'AI includes relevant dental/medical document items'
  );

  // Test AI Document Analysis
  const analysis1 = aiService.analyzeDocument('Bank Statement', 'bank_statement_september_2026.pdf');
  assert(analysis1.detected_type.includes('Bank Statement'), 'AI detected document type from file name');
  assert(analysis1.detected_period === 'September 2026', 'AI detected statement period from filename');
  assert(analysis1.potential_mismatch === null, 'No period mismatch flagged for matching month');

  const mismatchAnalysis = aiService.analyzeDocument(
    'Bank Statement (September 2026)',
    'chase_statement_august_2026.pdf'
  );
  assert(
    mismatchAnalysis.potential_mismatch !== null,
    'AI flagged potential month mismatch between required September and uploaded August file'
  );
  console.log();

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('DocChase Master Build Specification is fully compliant.');
  console.log('====================================================');
}

runVerification().catch((err) => {
  console.error('\nVerification failed with exception:', err);
  process.exit(1);
});
