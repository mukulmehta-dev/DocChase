/**
 * DocChase Strict Independent Security & Isolation Audit Test
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

import { generateSecureToken, hashToken } from '../src/utils/crypto';
import { clientService } from '../src/services/clients';
import { requestService } from '../src/services/requests';
import { documentService } from '../src/services/documents';
import { billingService } from '../src/services/billing';

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('🔒 Running DocChase Security & Isolation Audit');
  console.log('====================================================\n');

  // Test 1: Cross-Workspace Isolation
  console.log('1. Cross-Workspace Data Leakage Audit:');
  const wsA = 'ws_alpha_firm';
  const wsB = 'ws_beta_firm';

  const clientA = await clientService.createClient(wsA, 'free', {
    name: 'Alice Alpha',
    company_name: 'Alpha Corp',
    email: 'alice@alpha.com',
  });

  const clientB = await clientService.createClient(wsB, 'free', {
    name: 'Bob Beta',
    company_name: 'Beta LLC',
    email: 'bob@beta.com',
  });

  const clientsInA = await clientService.getClients(wsA);
  const clientsInB = await clientService.getClients(wsB);

  const aHasB = clientsInA.some((c) => c.id === clientB.id);
  const bHasA = clientsInB.some((c) => c.id === clientA.id);

  if (!aHasB && !bHasA) {
    console.log('  ✅ [PASS] Clients are isolated per workspace (No cross-tenant leakage)');
  } else {
    console.error('  ❌ [FAIL] Cross-workspace client leakage detected!');
  }

  // Test 2: Client Request Isolation
  const reqA = await requestService.createRequest(wsA, 'free', {
    clientId: clientA.id,
    clientName: clientA.name,
    title: 'Alpha Monthly Books',
    period: 'September 2026',
    dueDate: '2026-10-15',
    items: [{ name: 'Bank Statement', required: true }],
  });

  const reqB = await requestService.createRequest(wsB, 'free', {
    clientId: clientB.id,
    clientName: clientB.name,
    title: 'Beta Monthly Books',
    period: 'September 2026',
    dueDate: '2026-10-15',
    items: [{ name: 'Tax Return', required: true }],
  });

  const requestsA = await requestService.getRequests(wsA);
  const requestsB = await requestService.getRequests(wsB);

  const reqAHasB = requestsA.some((r) => r.id === reqB.request.id);
  const reqBHasA = requestsB.some((r) => r.id === reqA.request.id);

  if (!reqAHasB && !reqBHasA) {
    console.log('  ✅ [PASS] Requests are isolated per workspace');
  } else {
    console.error('  ❌ [FAIL] Cross-workspace request leakage detected!');
  }

  // Test 3: Client Token Isolation
  console.log('\n2. Client Token Security & Isolation:');
  const tokenA = reqA.rawToken;
  const tokenB = reqB.rawToken;

  const payloadA = await requestService.getClientRequestByToken(tokenA);
  const payloadB = await requestService.getClientRequestByToken(tokenB);

  if (payloadA && payloadA.request.id === reqA.request.id && payloadA.request.id !== reqB.request.id) {
    console.log('  ✅ [PASS] Token A resolves ONLY Request A');
  } else {
    console.error('  ❌ [FAIL] Token A resolved incorrect request!');
  }

  // Test invalid token
  const invalidPayload = await requestService.getClientRequestByToken('invalid_token_1234567890abcdef');
  if (invalidPayload === null) {
    console.log('  ✅ [PASS] Invalid token strictly returns null (Access Denied)');
  } else {
    console.error('  ❌ [FAIL] Invalid token returned data!');
  }

  // Test 4: Can Token A be used to upload documents to Request B's item?
  console.log('\n3. Token Cross-Request Ingestion Tampering:');
  const itemB = (reqB.request as any).items[0];
  const dummyFile = new File(['dummy'], 'tamper.pdf', { type: 'application/pdf' });

  // In real Supabase: RLS would block this if authenticated, but what about unauthenticated client uploads?
  console.log('  ℹ️  [AUDIT] In Supabase storage, unauthenticated clients have no upload policy defined in 001_initial_schema.sql.');

  console.log('\n====================================================');
  console.log('🔒 Security Audit Simulation Complete');
  console.log('====================================================');
}

runSecurityAudit().catch(console.error);
