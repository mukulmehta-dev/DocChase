/**
 * Workspace Loading Resilience & Safe Provisioning Tests
 *
 * Covers:
 * A. Existing confirmed user with an existing workspace loads existing workspace, no RPC call
 * B. workspace_members query returns an error: authenticated session remains valid, no RPC call, no logout
 * C. workspace_members returns zero rows: create_workspace_for_user is allowed
 * D. membership exists but nested workspaces(*) is null: direct lookup succeeds, existing workspace loaded, no RPC
 * E. workspace creation RPC fails: authenticated user is NOT wiped from auth state
 * F. Existing auth concurrency tests pass
 * G. Existing clients RLS tests pass
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Setup localStorage polyfill for Node.js
if (!globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0,
  } as any;
}

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (t && !t.startsWith('#')) {
    const i = t.indexOf('=');
    if (i > -1) envVars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

import { authService } from '../src/services/auth';
import { supabase } from '../src/lib/supabase';

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
  console.log('\n═════════════════════════════════════════════════════════');
  console.log('  DocChase Workspace Resilience & Safe Provisioning Tests');
  console.log('═════════════════════════════════════════════════════════\n');

  const TEST_EMAIL = 'docchase.audit.1789840548911@gmail.com';
  const TEST_PASS = 'TestPassword123!@#Secure';

  // ── TEST A: Existing confirmed user with existing workspace ────────────────
  console.log('--- TEST A: Existing User Loads Existing Workspace Without RPC ---');
  let rpcCalledA = false;
  const origRpc = supabase.rpc;
  (supabase as any).rpc = (name: string, ...args: any[]) => {
    if (name === 'create_workspace_for_user') {
      rpcCalledA = true;
    }
    return origRpc.call(supabase, name, ...args as [any]);
  };

  try {
    const session = await authService.signIn(TEST_EMAIL, TEST_PASS);
    if (!session || !session.user) {
      fail('Sign in failed for confirmed user');
    } else if (session.workspaces.length === 0) {
      fail('Workspaces failed to load for user with existing workspaces');
    } else if (rpcCalledA) {
      fail('create_workspace_for_user was erroneously called for user with existing workspace!');
    } else {
      pass('Existing workspace loaded cleanly', `Workspace ID: ${session.currentWorkspace?.id}, rpcCalled=${rpcCalledA}`);
    }
  } finally {
    (supabase as any).rpc = origRpc;
  }

  // Setup active session mock for unit-style tests B through E
  const origGetSession = supabase.auth.getSession;
  (supabase.auth as any).getSession = async () => ({
    data: {
      session: {
        user: { id: '8433af81-e140-454e-b699-6124c4e4f9e1', email: TEST_EMAIL },
        access_token: 'mock_jwt_token'
      }
    }
  });

  // ── TEST B: workspace_members query returns an error ───────────────────────
  console.log('\n--- TEST B: workspace_members Query Error Preserves Session & Avoids RPC ---');
  let rpcCalledB = false;
  const origFrom = supabase.from;
  (supabase as any).rpc = (name: string, ...args: any[]) => {
    if (name === 'create_workspace_for_user') {
      rpcCalledB = true;
    }
    return origRpc.call(supabase, name, ...args as [any]);
  };

  // Mock workspace_members query returning a network error
  (supabase as any).from = (table: string) => {
    if (table === 'workspace_members') {
      return {
        select: () => ({
          eq: async () => ({
            data: null,
            error: { message: 'Transient network failure', code: 'PGRST000' }
          })
        })
      };
    }
    return origFrom.call(supabase, table);
  };

  try {
    const session = await authService.getSession();
    if (!session || !session.user) {
      fail('Authenticated session was annihilated when workspace query failed!');
    } else if (rpcCalledB) {
      fail('create_workspace_for_user was erroneously called on query error!');
    } else {
      pass('Session preserved despite workspace_members error', `user=${session.user.id}, rpcCalled=${rpcCalledB}`);
    }
  } finally {
    (supabase as any).from = origFrom;
    (supabase as any).rpc = origRpc;
  }

  // ── TEST C: Genuine zero confirmed memberships allows RPC ───────────────────
  console.log('\n--- TEST C: Genuine Zero Confirmed Memberships Allows RPC ---');
  let rpcCalledC = false;
  (supabase as any).from = (table: string) => {
    if (table === 'workspace_members') {
      return {
        select: () => ({
          eq: async () => ({
            data: [], // Genuine 0 rows with no error
            error: null
          })
        })
      };
    }
    return origFrom.call(supabase, table);
  };

  (supabase as any).rpc = async (name: string, params: any) => {
    if (name === 'create_workspace_for_user') {
      rpcCalledC = true;
      return {
        data: {
          id: 'ws_mock_provisioned_123',
          name: 'My Accounting Firm',
          slug: 'my-accounting-firm',
          logo_url: null,
          plan: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      };
    }
    return origRpc.call(supabase, name, params);
  };

  try {
    const session = await authService.getSession();
    if (!session || !session.user) {
      fail('Session should not be null during genuine provisioning');
    } else if (!rpcCalledC) {
      fail('create_workspace_for_user was NOT called when user genuinely had 0 workspaces!');
    } else if (session.workspaces[0]?.id !== 'ws_mock_provisioned_123') {
      fail('Provisioned workspace was not added to session');
    } else {
      pass('create_workspace_for_user executed for genuine 0-membership user', `rpcCalled=${rpcCalledC}`);
    }
  } finally {
    (supabase as any).from = origFrom;
    (supabase as any).rpc = origRpc;
  }

  // ── TEST D: Nested workspaces(*) join null triggers direct lookup ─────────
  console.log('\n--- TEST D: Nested workspaces(*) null Triggers Direct Lookup ---');
  let directLookupCalled = false;
  let rpcCalledD = false;

  (supabase as any).rpc = (name: string, ...args: any[]) => {
    if (name === 'create_workspace_for_user') rpcCalledD = true;
    return origRpc.call(supabase, name, ...args as [any]);
  };

  (supabase as any).from = (table: string) => {
    if (table === 'workspace_members') {
      return {
        select: () => ({
          eq: async () => ({
            // Membership exists, but nested workspaces is null (join failure)
            data: [{ workspace_id: 'ws_direct_fallback_id', role: 'owner', workspaces: null }],
            error: null
          })
        })
      };
    }
    if (table === 'workspaces') {
      return {
        select: () => ({
          in: async (col: string, ids: string[]) => {
            directLookupCalled = true;
            return {
              data: [{
                id: 'ws_direct_fallback_id',
                name: 'Directly Recovered Workspace',
                slug: 'directly-recovered',
                logo_url: null,
                plan: 'free',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }],
              error: null
            };
          }
        })
      };
    }
    return origFrom.call(supabase, table);
  };

  try {
    const session = await authService.getSession();
    if (!session || !session.user) {
      fail('Session became null during direct fallback');
    } else if (!directLookupCalled) {
      fail('Direct workspace lookup was not triggered when relational join was null');
    } else if (rpcCalledD) {
      fail('create_workspace_for_user was erroneously called instead of direct lookup!');
    } else if (session.currentWorkspace?.name !== 'Directly Recovered Workspace') {
      fail('Directly recovered workspace was not set as currentWorkspace');
    } else {
      pass('Direct lookup fallback recovered existing workspace', `directLookup=${directLookupCalled}, rpcCalled=${rpcCalledD}`);
    }
  } finally {
    (supabase as any).from = origFrom;
    (supabase as any).rpc = origRpc;
  }

  // ── TEST E: Failed RPC does NOT wipe user from session ──────────────────────
  console.log('\n--- TEST E: Failed Workspace RPC Does NOT Wipe Authenticated User ---');
  (supabase as any).from = (table: string) => {
    if (table === 'workspace_members') {
      return {
        select: () => ({
          eq: async () => ({
            data: [], // 0 workspaces
            error: null
          })
        })
      };
    }
    return origFrom.call(supabase, table);
  };

  (supabase as any).rpc = async (name: string) => {
    if (name === 'create_workspace_for_user') {
      return {
        data: null,
        error: { message: 'No API key found in request', code: '400' }
      };
    }
    return origRpc.call(supabase, name);
  };

  try {
    const session = await authService.getSession();
    if (!session) {
      fail('Session was completely wiped (null) when RPC failed! User would be logged out.');
    } else if (!session.user) {
      fail('session.user was wiped when RPC failed!');
    } else {
      pass('Authenticated user preserved even when workspace RPC fails', `user=${session.user.id}, workspacesCount=${session.workspaces.length}`);
    }
  } finally {
    (supabase as any).from = origFrom;
    (supabase as any).rpc = origRpc;
    (supabase.auth as any).getSession = origGetSession;
  }

  console.log('\n═════════════════════════════════════════════════════════');
  console.log(`  WORKSPACE RESILIENCE TESTS: ${passed} passed, ${failed} failed`);
  console.log('═════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Test suite runner exception:', e);
  process.exit(1);
});
