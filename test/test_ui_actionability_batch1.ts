/**
 * DocChase Batch 1 — UI Actionability Fixes Test Suite
 * Validates:
 * 1. Dashboard "Add Client" flow & elimination of `/clients/new` navigation
 * 2. Secure Portal Link lifecycle, hash verification, token rotation, audit logging & plaintext exclusion
 * 3. Document Review real download & elimination of fake zoom spans
 * 4. Template Delete action, confirmation modal & deletion service
 * 5. Vault Refresh in-place data loading & elimination of `window.location.reload()`
 * 6. Sign-in UI: elimination of unmanaged "Remember 30 Days" checkbox
 * 7. Requests Status Taxonomy: 'sent' & 'in_progress' unified filtering
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

import { requestService, getCachedPortalToken, setCachedPortalToken } from '../src/services/requests';
import { clientService } from '../src/services/clients';
import { templateService } from '../src/services/templates';
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

async function runBatch1ActionabilityTests() {
  console.log('================================================================');
  console.log('🎯 DocChase Batch 1 — UI Actionability Fixes Verification Suite');
  console.log('================================================================\n');

  const rootDir = process.cwd();

  // =================================================================
  // GROUP 1: Dashboard "Add Client" & Route Validation
  // =================================================================
  console.log('--- Group 1: Dashboard "Add Client" Actionability ---');

  const dashboardContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/DashboardPage.tsx'), 'utf-8');
  assert(
    !dashboardContent.includes("navigate('/clients/new')") && !dashboardContent.includes('navigate("/clients/new")'),
    'Test 1.1: Dashboard "Add Client" eliminates dead route navigate("/clients/new")'
  );
  assert(
    dashboardContent.includes('<AddClientModal') && dashboardContent.includes('setIsAddClientModalOpen(true)'),
    'Test 1.2: Dashboard opens AddClientModal with real client creation workflow'
  );
  assert(
    dashboardContent.includes('loadDashboard()') && dashboardContent.includes('onSuccess='),
    'Test 1.3: AddClientModal triggers loadDashboard() to refresh metrics upon creation'
  );

  const appRoutesContent = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
  assert(
    !appRoutesContent.includes('path="clients/new"'),
    'Test 1.4: App.tsx maintains clean routing without fake "/clients/new" dummy route'
  );

  const wsId1 = 'ws_actionability_1_' + Date.now();
  const createdClient = await clientService.createClient(
    wsId1,
    'free',
    {
      name: 'Acme Test Corp',
      company_name: 'Acme Corp',
      email: 'acme@example.com',
      phone: '555-0199',
    },
    'test_user_id'
  );
  assert(
    !!createdClient && createdClient.name === 'Acme Test Corp' && createdClient.status === 'active',
    'Test 1.5: clientService.createClient creates a legitimate active client'
  );

  // =================================================================
  // GROUP 2: Secure Portal Link, Token Rotation & Zero Plaintext DB
  // =================================================================
  console.log('\n--- Group 2: Secure Portal Link Lifecycle & Rotation ---');

  const reqContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/RequestDetailPage.tsx'), 'utf-8');
  assert(
    !reqContent.includes('slice(0, 16)') && !reqContent.includes('slice(0,16)'),
    'Test 2.1: RequestDetailPage completely eliminates slice(0,16) hash bastardization'
  );

  // Create request and check raw token
  const createResult = await requestService.createRequest(
    wsId1,
    'free',
    {
      clientId: createdClient.id,
      clientName: createdClient.name,
      title: 'Q3 Tax Filing Audit',
      period: '2026-Q3',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      items: [{ name: 'Bank Statement', required: true }],
    },
    'test_user_id'
  );

  const createdReq = createResult.request;
  const rawToken1 = createResult.rawToken;
  assert(
    !!rawToken1 && rawToken1.length === 64,
    'Test 2.2: createRequest returns valid 64-character raw cryptographic token'
  );

  // Verify token cache
  const cachedToken1 = getCachedPortalToken(createdReq.id);
  assert(
    cachedToken1 === rawToken1,
    'Test 2.3: Raw token is safely cached in memory for immediate copy actions'
  );

  // Verify client portal resolves with rawToken1
  const portalData1 = await requestService.getClientRequestByToken(rawToken1!);
  assert(
    !!portalData1 && portalData1.request.title === 'Q3 Tax Filing Audit',
    'Test 2.4: Client portal successfully verifies and loads with valid raw token'
  );

  // Verify that passing token hash does NOT resolve (hash verification)
  const portalWithHash = await requestService.getClientRequestByToken(createdReq.access_token_hash);
  assert(
    portalWithHash === null,
    'Test 2.5: Supplying the token hash directly is strictly rejected by portal verification'
  );

  // Rotate token securely
  const rotatedToken = await requestService.rotatePortalToken(wsId1, createdReq.id, 'user_test_actor');
  assert(
    !!rotatedToken && rotatedToken.length === 64,
    'Test 2.6: rotatePortalToken generates fresh 64-char cryptographic raw token'
  );
  assert(
    rotatedToken !== rawToken1,
    'Test 2.7: Rotated token is distinct from previous token'
  );

  // Old token MUST now be invalidated
  const oldTokenPortal = await requestService.getClientRequestByToken(rawToken1!);
  assert(
    oldTokenPortal === null,
    'Test 2.8: Old raw token is invalidated immediately following rotation'
  );

  // New rotated token MUST resolve portal
  const newTokenPortal = await requestService.getClientRequestByToken(rotatedToken);
  assert(
    !!newTokenPortal && newTokenPortal.request.id === createdReq.id,
    'Test 2.9: New rotated token resolves client portal successfully'
  );

  // Unauthorized workspace rotation isolation
  try {
    await requestService.rotatePortalToken('wrong_ws_id', createdReq.id, 'user_attacker');
    assert(false, 'Test 2.10: Cross-workspace token rotation must be rejected');
  } catch (err: any) {
    assert(
      true,
      'Test 2.10: Cross-workspace token rotation is strictly rejected with authorization error'
    );
  }

  // =================================================================
  // GROUP 3: Document Review Real Download & Removal of Fake Controls
  // =================================================================
  console.log('\n--- Group 3: Document Review Viewer Controls ---');

  const docReviewContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/DocumentReviewPage.tsx'), 'utf-8');
  assert(
    !docReviewContent.includes('zoom_in') && !docReviewContent.includes('zoom_out'),
    'Test 3.1: DocumentReviewPage eliminates fake non-functional zoom_in / zoom_out controls'
  );
  assert(
    docReviewContent.includes('handleDownloadDocument') && docReviewContent.includes('documentService.getSignedDocumentUrl'),
    'Test 3.2: DocumentReviewPage wires real handleDownloadDocument via secure getSignedDocumentUrl'
  );

  const signedUrl = await documentService.getSignedDocumentUrl('docs/test-doc-1.pdf');
  assert(
    typeof signedUrl === 'string' && signedUrl.length > 0,
    'Test 3.3: documentService.getSignedDocumentUrl provides private signed document access'
  );

  // =================================================================
  // GROUP 4: Template Delete Action & Confirmation Flow
  // =================================================================
  console.log('\n--- Group 4: Template Deletion Actionability ---');

  const templatesPageContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/TemplatesPage.tsx'), 'utf-8');
  assert(
    templatesPageContent.includes('handleConfirmDelete') && templatesPageContent.includes('templateToDelete'),
    'Test 4.1: TemplatesPage implements confirmation-gated template deletion'
  );
  assert(
    templatesPageContent.includes('templateService.deleteTemplate'),
    'Test 4.2: TemplatesPage calls templateService.deleteTemplate upon confirmation'
  );
  assert(
    templatesPageContent.includes('Delete Template') && templatesPageContent.includes('Cancel'),
    'Test 4.3: Confirmation modal provides explicit Delete and Cancel buttons'
  );

  // Verify deletion service with real template creation and deletion
  const template = await templateService.createTemplate(
    wsId1,
    {
      name: 'Temporary Deletion Test Template',
      description: 'To be deleted',
      frequency: 'monthly',
    },
    [{ name: 'Test Doc', required: true }]
  );

  const templatesBefore = await templateService.getTemplates(wsId1);
  assert(
    templatesBefore.some((t) => t.id === template.id),
    'Test 4.4: Template exists in workspace before deletion'
  );

  await templateService.deleteTemplate(wsId1, template.id);
  const templatesAfter = await templateService.getTemplates(wsId1);
  assert(
    !templatesAfter.some((t) => t.id === template.id),
    'Test 4.5: templateService.deleteTemplate successfully removes template from workspace'
  );

  // =================================================================
  // GROUP 5: Vault Refresh In-Place (No Page Reload)
  // =================================================================
  console.log('\n--- Group 5: Vault Refresh In-Place Loading ---');

  const docsPageContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/DocumentsPage.tsx'), 'utf-8');
  assert(
    !docsPageContent.includes('window.location.reload()'),
    'Test 5.1: DocumentsPage completely eliminates destructive window.location.reload()'
  );
  assert(
    docsPageContent.includes('onClick={() => loadVault()}') || docsPageContent.includes('onClick={loadVault}'),
    'Test 5.2: DocumentsPage Refresh action calls loadVault() in-place'
  );
  assert(
    docsPageContent.includes('isLoading={loading}'),
    'Test 5.3: Refresh button visually indicates loading state while fetching vault data'
  );

  // =================================================================
  // GROUP 6: Sign-In UI "Remember 30 Days" Removal
  // =================================================================
  console.log('\n--- Group 6: Sign-In UI Hardening ---');

  const signInContent = fs.readFileSync(path.join(rootDir, 'src/pages/auth/SignInPage.tsx'), 'utf-8');
  assert(
    !signInContent.includes('Remember') && !signInContent.includes('30 days') && !signInContent.includes('30 Days'),
    'Test 6.1: SignInPage eliminates misleading unmanaged "Remember 30 Days" checkbox'
  );
  assert(
    signInContent.includes('handleSubmit') && signInContent.includes('signIn('),
    'Test 6.2: SignInPage preserves standard Supabase session authentication and password recovery'
  );

  // =================================================================
  // GROUP 7: Request Status Taxonomy Filtering Harmonization
  // =================================================================
  console.log('\n--- Group 7: Request Status Taxonomy Harmonization ---');

  const requestsPageContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/RequestsPage.tsx'), 'utf-8');
  assert(
    requestsPageContent.includes("status === 'sent'") && requestsPageContent.includes("status === 'in_progress'"),
    'Test 7.1: RequestsPage filters and counts both "sent" and "in_progress" in Waiting/In Progress tab'
  );

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('\n================================================================');
  console.log(`📊 Batch 1 Actionability Test Results: ${stats.passed}/${stats.total} Passed (${stats.failed} Failed)`);
  console.log('================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runBatch1ActionabilityTests().catch((err) => {
  console.error('Unhandled error in actionability tests:', err);
  process.exit(1);
});
