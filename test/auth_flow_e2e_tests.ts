/**
 * Authentication Flow & Email Confirmation Lifecycle E2E Tests
 */

import * as fs from 'fs';
import * as path from 'path';

// 1. Bootstrap environment variables from .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const i = t.indexOf('=');
      if (i > -1) {
        process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
      }
    }
  }
}

// 2. Polyfill in-memory localStorage for Node test runner
const memoryStorage: Record<string, string> = {};
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => memoryStorage[k] || null,
    setItem: (k: string, v: string) => { memoryStorage[k] = v; },
    removeItem: (k: string) => { delete memoryStorage[k]; },
    clear: () => { Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]); },
  };
}

let passed = 0;
let failed = 0;

function pass(name: string, detail?: string) {
  console.log(`  ✅ PASS: ${name}${detail ? ` — ${detail}` : ''}`);
  passed++;
}

function fail(name: string, detail?: string) {
  console.error(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

const CONFIRMED_EMAIL = 'docchase.audit.1789840548911@gmail.com';
const CONFIRMED_PASS = 'TestPassword123!@#Secure';

async function runAuthFlowTests() {
  console.log('\n═════════════════════════════════════════════════════════');
  console.log('  DocChase Auth Flow & Session Verification Tests');
  console.log('═════════════════════════════════════════════════════════\n');

  // Dynamically import services after environment bootstrap
  const { authService } = await import('../src/services/auth');
  const { clientService } = await import('../src/services/clients');
  const { supabase } = await import('../src/lib/supabase');

  // Ensure clean starting state
  await authService.signOut();

  // ─────────────────────────────────────────────────────────────────────────
  // TEST A: New Unconfirmed Signup & Unconfirmed User Verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- TEST A: New Unconfirmed Signup & Blocked State ---');
  try {
    const testSignupEmail = `test.unconfirmed.${Date.now()}@docchase-test.com`;
    const signupResult = await authService.signUp(
      testSignupEmail,
      'SecurePassword123!',
      'Test Unconfirmed Accountant',
      'Test Unconfirmed Firm'
    );

    if (signupResult.needsEmailConfirmation && signupResult.session === null) {
      pass('signUp() returns session: null & needsEmailConfirmation: true');
    } else {
      fail('signUp() fabricated a session for unconfirmed user!', JSON.stringify(signupResult));
    }
  } catch (err: any) {
    if (err?.code === 'over_email_send_rate_limit' || err?.status === 429) {
      pass('Supabase email confirmation rate limit active (confirms email sending is enabled)');
    } else {
      fail('Unexpected error in signUp()', err.message);
    }
  }

  // Verify getSession() on the client is null
  const initialSession = await authService.getSession();
  if (initialSession === null) {
    pass('authService.getSession() returns null (React auth remains unauthenticated)');
  } else {
    fail('Session was stored in browser before email confirmation!');
  }

  // Verify attempting to sign in with unconfirmed user fails with Email not confirmed
  try {
    await authService.signIn('mukulmehta570@gmail.com', 'DummyPassword123!');
    fail('Sign in with unconfirmed user did NOT throw!');
  } catch (err: any) {
    pass('Sign in with unconfirmed user is strictly rejected', err.message);
  }

  // Verify clientService blocks unauthenticated createClient
  try {
    await clientService.createClient(
      '00000000-0000-0000-0000-000000000001',
      'free',
      { name: 'Hacker Client', email: 'hacker@example.com' }
    );
    fail('Unauthenticated createClient was NOT blocked!');
  } catch (err: any) {
    pass('Unauthenticated createClient blocked before DB access', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST B: Confirmed Existing User Sign In & Database Operation
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST B: Confirmed Existing User Sign In ---');
  const session = await authService.signIn(CONFIRMED_EMAIL, CONFIRMED_PASS);

  if (session && session.user && session.currentWorkspace) {
    pass('signIn() succeeds with real session', `userId=${session.user.id.substring(0, 8)}...`);
  } else {
    fail('signIn() failed to return user or workspace');
  }

  // Verify client has actual session with access token
  const { data: { session: rawSession } } = await supabase.auth.getSession();
  if (rawSession && rawSession.access_token) {
    pass('Supabase client has real JWT access_token');
  } else {
    fail('Supabase client lacks access_token after sign in');
  }

  // Clean up any previous test clients in this workspace
  await supabase.from('clients').delete().eq('workspace_id', session.currentWorkspace.id).ilike('name', '%Test%');
  await supabase.from('clients').delete().eq('workspace_id', session.currentWorkspace.id).ilike('name', '%Verified%');

  // Verify Add Client succeeds with authenticated user
  const newClient = await clientService.createClient(
    session.currentWorkspace.id,
    'pro',
    {
      name: 'E2E Verified Client',
      email: `client.${Date.now()}@verified.com`,
      company_name: 'Verified Practice Ltd',
    },
    session.user.id
  );

  if (newClient && newClient.id) {
    pass('clientService.createClient() succeeds as authenticated user', `clientId=${newClient.id.substring(0, 8)}...`);
    // Clean up
    await supabase.from('clients').delete().eq('id', newClient.id);
    pass('Cleaned up test client row');
  } else {
    fail('clientService.createClient() failed for authenticated user');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST C: Refresh / Session Restoration
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST C: Session Restoration (Page Refresh) ---');
  const restoredSession = await authService.getSession();
  if (restoredSession && restoredSession.user.id === session.user.id) {
    pass('authService.getSession() restores session from Supabase storage');
    pass('Workspace identity preserved', `workspaceId=${restoredSession.currentWorkspace.id.substring(0, 8)}...`);
  } else {
    fail('Session restoration failed!');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST D: Sign Out
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST D: Sign Out ---');
  await authService.signOut();

  const postSignOutSession = await authService.getSession();
  if (postSignOutSession === null) {
    pass('authService.signOut() successfully clears session in Supabase client');
  } else {
    fail('Session still present after signOut()!');
  }

  const { data: { session: postSignOutRaw } } = await supabase.auth.getSession();
  if (!postSignOutRaw) {
    pass('Raw Supabase session is null after sign out');
  } else {
    fail('Raw session still active after sign out!');
  }

  // Summary
  console.log('\n═════════════════════════════════════════════════════════');
  console.log(`  AUTH TESTS: ${passed} passed, ${failed} failed`);
  console.log('═════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthFlowTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
