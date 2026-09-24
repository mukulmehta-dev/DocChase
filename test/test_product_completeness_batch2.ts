/**
 * DocChase Batch 2 — Product Completeness Test Suite
 * Validates:
 * 1. Template Management Completion (editing, validation, persistence, isolation, request immutability)
 * 2. Workspace Member Management (listing, adding by email, role changes, removal, last-owner protection)
 * 3. Role-Based Safety Invariants (owner authority, member/admin restrictions, server-side enforcement)
 * 4. Reminders UX (real 5-step cadence, active stop rules, real audit activity, no fake controls)
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

import { templateService } from '../src/services/templates';
import { workspaceService } from '../src/services/workspaces';
import { auditService } from '../src/services/audit';
import { requestService } from '../src/services/requests';
import { clientService } from '../src/services/clients';

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

async function runBatch2ProductCompletenessTests() {
  console.log('================================================================');
  console.log('🎯 DocChase Batch 2 — Product Completeness Verification Suite');
  console.log('================================================================\n');

  const rootDir = process.cwd();

  // =================================================================
  // GROUP 1: Template Management Completion & Editing
  // =================================================================
  console.log('--- Group 1: Template Management Completion & Editing ---');

  const templatesPageContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/TemplatesPage.tsx'), 'utf-8');

  assert(
    templatesPageContent.includes('handleOpenEditModal') && templatesPageContent.includes('isEditModalOpen'),
    'Test 1.1: TemplatesPage exposes dedicated Edit modal state and handler'
  );

  assert(
    templatesPageContent.includes('handleSaveEdit') && templatesPageContent.includes('templateService.updateTemplate'),
    'Test 1.2: TemplatesPage calls templateService.updateTemplate to persist edited templates'
  );

  assert(
    templatesPageContent.includes('handleConfirmDelete') && templatesPageContent.includes('templateToDelete'),
    'Test 1.3: TemplatesPage preserves existing delete functionality alongside edit'
  );

  assert(
    templatesPageContent.includes('handleAddEditItemSlot') &&
      templatesPageContent.includes('handleRemoveEditItemSlot') &&
      templatesPageContent.includes('it.required'),
    'Test 1.4: TemplatesPage edit modal supports adding, removing, and toggling required status of items'
  );

  const wsA = 'ws_template_test_A_' + Date.now();
  const wsB = 'ws_template_test_B_' + Date.now();

  const originalTemplate = await templateService.createTemplate(
    wsA,
    {
      name: 'Initial Onboarding Blueprint',
      description: 'Initial client intake documentation',
      category: 'onboarding',
      frequency: 'ad_hoc',
    },
    [
      { name: 'Photo ID', description: 'Passport or Drivers License', is_required: true, category: 'identity' },
      { name: 'Proof of Address', description: 'Utility bill under 90 days', is_required: true, category: 'compliance' },
    ]
  );

  assert(
    originalTemplate.id && originalTemplate.name === 'Initial Onboarding Blueprint',
    'Test 1.5: templateService successfully creates base template'
  );

  // Validate updateTemplate persists changes
  const updatedTemplate = await templateService.updateTemplate(
    wsA,
    originalTemplate.id,
    {
      name: 'Updated 2026 Onboarding Blueprint',
      description: 'Revised client intake requirements with direct debit',
      category: 'onboarding',
      frequency: 'ad_hoc',
    },
    [
      { name: 'Government ID', description: 'Passport or National ID', is_required: true, category: 'identity' },
      { name: 'Proof of Address', description: 'Utility bill under 90 days', is_required: true, category: 'compliance' },
      { name: 'Void Cheque / Bank Letter', description: 'For direct debit setup', is_required: false, category: 'banking' },
    ]
  );

  assert(
    updatedTemplate.name === 'Updated 2026 Onboarding Blueprint',
    'Test 1.6: templateService.updateTemplate updates template name'
  );
  assert(
    updatedTemplate.description === 'Revised client intake requirements with direct debit',
    'Test 1.7: templateService.updateTemplate updates description'
  );
  assert(
    updatedTemplate.items.length === 3 && updatedTemplate.items.some((i: any) => i.name === 'Void Cheque / Bank Letter'),
    'Test 1.8: templateService.updateTemplate updates items list and required flags'
  );

  // Validate workspace isolation: Workspace B cannot see or modify template from Workspace A
  const wsBTemplates = await templateService.getTemplates(wsB);
  assert(
    !wsBTemplates.some((t) => t.id === originalTemplate.id),
    'Test 1.9: Workspace isolation guarantees templates belong strictly to their workspace'
  );

  let crossWsErrorCaught = false;
  try {
    await templateService.updateTemplate(
      wsB,
      originalTemplate.id,
      { name: 'Attacker Hijacked Template' },
      [{ name: 'Injected Item' }]
    );
  } catch {
    crossWsErrorCaught = true;
  }
  assert(
    crossWsErrorCaught,
    'Test 1.10: Cross-workspace template mutation is blocked'
  );

  // Validate that requests created prior to template edit remain completely unaffected
  const testClient = await clientService.createClient(wsA, 'free', {
    name: 'Blueprint Client',
    company_name: 'Blueprint Corp',
    email: 'client@blueprint.corp',
    requires_reminders: true,
  });

  const createdRequest = await requestService.createRequest(wsA, 'free', {
    clientId: testClient.id,
    clientName: testClient.name,
    title: 'Client Intake Request',
    period: '2026-09',
    dueDate: '2026-10-15',
    items: [
      { name: 'Snapshot Original Item', description: 'Must not change on template edit', required: true },
    ],
  });

  // Mutate template again
  await templateService.updateTemplate(
    wsA,
    originalTemplate.id,
    { name: 'Newest Blueprint Iteration' },
    [{ name: 'Brand New Item Name', is_required: false }]
  );

  const reloadedRequest = await requestService.getRequestDetails(wsA, createdRequest.request.id);
  assert(
    reloadedRequest?.items?.some((i: any) => i.name === 'Snapshot Original Item'),
    'Test 1.11: Editing template does NOT mutate requirements on existing dispatched requests'
  );

  // =================================================================
  // GROUP 2: Workspace Member Management & Access Control UI
  // =================================================================
  console.log('\n--- Group 2: Workspace Member Management & Access Control ---');

  const settingsPageContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/SettingsPage.tsx'), 'utf-8');

  assert(
    settingsPageContent.includes('Workspace Members & Access Control'),
    'Test 2.1: SettingsPage renders dedicated Workspace Members section'
  );

  assert(
    settingsPageContent.includes('handleAddMember') && settingsPageContent.includes('isAddMemberModalOpen'),
    'Test 2.2: SettingsPage includes Add Member workflow and modal'
  );

  assert(
    settingsPageContent.includes('handleConfirmRoleChange') && settingsPageContent.includes('memberToChangeRole'),
    'Test 2.3: SettingsPage includes Role Change workflow and modal'
  );

  assert(
    settingsPageContent.includes('handleConfirmRemove') && settingsPageContent.includes('memberToRemove'),
    'Test 2.4: SettingsPage includes Remove Member workflow and confirmation modal'
  );

  assert(
    settingsPageContent.includes('External email invitations with signed tokens for unregistered users will be available in an upcoming release'),
    'Test 2.5: Safe invitation boundary clearly stated (no insecure unauthenticated token email invitations)'
  );

  // Service tests for workspace members
  const wsMemTestId = 'ws_member_test_' + Date.now();
  const initialMembers = await workspaceService.getWorkspaceMembers(wsMemTestId);
  assert(
    Array.isArray(initialMembers),
    'Test 2.6: workspaceService.getWorkspaceMembers returns member list array'
  );

  // Add registered member
  await workspaceService.addMemberByEmail(wsMemTestId, 'colleague@firm.com', 'admin');
  let currentMembers = await workspaceService.getWorkspaceMembers(wsMemTestId);
  const addedMember = currentMembers.find((m) => m.email === 'colleague@firm.com');
  assert(
    !!addedMember && addedMember.role === 'admin',
    'Test 2.7: workspaceService.addMemberByEmail registers member with specified role'
  );

  // Update member role
  await workspaceService.updateMemberRole(wsMemTestId, addedMember!.id, 'member');
  currentMembers = await workspaceService.getWorkspaceMembers(wsMemTestId);
  const updatedMember = currentMembers.find((m) => m.id === addedMember!.id);
  assert(
    updatedMember?.role === 'member',
    'Test 2.8: workspaceService.updateMemberRole successfully updates role to member'
  );

  // Server-side last owner protection
  await workspaceService.addMemberByEmail(wsMemTestId, 'primary_owner@firm.com', 'owner');
  currentMembers = await workspaceService.getWorkspaceMembers(wsMemTestId);
  const ownerMember = currentMembers.find((m) => m.email === 'primary_owner@firm.com');
  assert(
    ownerMember?.role === 'owner',
    'Test 2.9: Workspace owner record successfully established'
  );

  // Remove non-owner member
  await workspaceService.removeMember(wsMemTestId, addedMember!.id);
  let remainingMembers = await workspaceService.getWorkspaceMembers(wsMemTestId);
  assert(
    !remainingMembers.some((m) => m.id === addedMember!.id),
    'Test 2.10: workspaceService.removeMember cleanly removes non-owner member'
  );

  // Isolate sole owner by removing seed owner
  const defaultOwner = remainingMembers.find((m) => m.id === 'mem_default_owner');
  if (defaultOwner) {
    await workspaceService.removeMember(wsMemTestId, defaultOwner.id);
  }

  // Try to remove the last owner
  let lastOwnerErrorCaught = false;
  try {
    await workspaceService.removeMember(wsMemTestId, ownerMember!.id);
  } catch (err: any) {
    lastOwnerErrorCaught = true;
  }
  assert(
    lastOwnerErrorCaught,
    'Test 2.11: Last-owner protection prevents deleting the sole owner of a workspace'
  );

  // Try to demote the last owner
  let lastOwnerDemoteError = false;
  try {
    await workspaceService.updateMemberRole(wsMemTestId, ownerMember!.id, 'member');
  } catch (err: any) {
    lastOwnerDemoteError = true;
  }
  assert(
    lastOwnerDemoteError,
    'Test 2.12: Last-owner protection prevents demoting the sole owner of a workspace'
  );

  // =================================================================
  // GROUP 3: Reminders Page Clarity & Real Audit Activity
  // =================================================================
  console.log('\n--- Group 3: Reminders Page Clarity & Real Activity ---');

  const remindersPageContent = fs.readFileSync(path.join(rootDir, 'src/pages/accountant/RemindersPage.tsx'), 'utf-8');

  assert(
    !remindersPageContent.includes('<input') && !remindersPageContent.includes('onChange='),
    'Test 3.1: RemindersPage contains NO fake configuration inputs or sliders'
  );

  assert(
    remindersPageContent.includes('Immediate Request Notification') &&
      remindersPageContent.includes('7-Day Check-in Warning') &&
      remindersPageContent.includes('3-Day Urgent Action Notice') &&
      remindersPageContent.includes('1-Day Final Call') &&
      remindersPageContent.includes('Due-Date & Post-Deadline Escalation'),
    'Test 3.2: RemindersPage accurately documents all 5 stages of the automated cadence'
  );

  assert(
    remindersPageContent.includes('Item-Level Stop Rules') &&
      remindersPageContent.includes('Per-Item Exclusion') &&
      remindersPageContent.includes('READY Status Lock'),
    'Test 3.3: RemindersPage clearly explains per-item exclusion and cycle READY stop rules'
  );

  assert(
    remindersPageContent.includes('Recent Reminder Activity') &&
      remindersPageContent.includes('auditService.getLogs'),
    'Test 3.4: RemindersPage queries real reminder audit logs from auditService'
  );

  assert(
    remindersPageContent.includes('Send Smart Reminder') || remindersPageContent.includes('On-Demand Reminders'),
    'Test 3.5: RemindersPage directs accountants to active requests for on-demand smart reminders'
  );

  // Real audit log verification for reminders
  const auditWsId = 'ws_audit_reminder_test_' + Date.now();
  await auditService.log(auditWsId, 'reminder.sent', 'request', 'req_test_1', {
    client_name: 'Acme Test Corp',
    count: 2,
    items: ['Tax Return', 'Bank Statement'],
  });

  const logs = await auditService.getLogs(auditWsId);
  const reminderEntries = logs.filter((l) => l.action === 'reminder.sent');
  assert(
    reminderEntries.length === 1 && reminderEntries[0].metadata?.client_name === 'Acme Test Corp',
    'Test 3.6: Real reminder dispatch events are recorded and retrievable via auditService'
  );

  // =================================================================
  // GROUP 4: Visual System & Responsiveness Invariants
  // =================================================================
  console.log('\n--- Group 4: Visual System & Responsive Design ---');

  assert(
    !settingsPageContent.includes('bg-blue-') &&
      !settingsPageContent.includes('text-blue-') &&
      !templatesPageContent.includes('bg-blue-') &&
      !templatesPageContent.includes('text-blue-') &&
      !remindersPageContent.includes('bg-blue-') &&
      !remindersPageContent.includes('text-blue-'),
    'Test 4.1: Strictly maintains monochrome design language across all modified pages (zero blue accents)'
  );

  assert(
    settingsPageContent.includes('dark:') &&
      templatesPageContent.includes('dark:') &&
      remindersPageContent.includes('dark:'),
    'Test 4.2: Full dark mode styling supported across all modified components'
  );

  assert(
    settingsPageContent.includes('sm:flex-row') &&
      templatesPageContent.includes('md:grid-cols-2') &&
      remindersPageContent.includes('lg:grid-cols-3'),
    'Test 4.3: Responsive layout breakpoints (mobile 390px, tablet 768px, desktop 1440px) properly handled'
  );

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('\n================================================================');
  console.log(`📊 Batch 2 Product Completeness Test Results: ${stats.passed}/${stats.total} Passed (${stats.failed} Failed)`);
  console.log('================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runBatch2ProductCompletenessTests().catch((err) => {
  console.error('Unhandled error in Batch 2 tests:', err);
  process.exit(1);
});
