import { supabase, isSupabaseConfigured, isProduction, assertProductionConfigured, CONFIG_ERROR_MESSAGE } from '../lib/supabase';
import type { Profile, Workspace } from '../types';

const DEV_AUTH_KEY = 'docchase_dev_auth_session';
const DEV_PROFILES_KEY = 'docchase_dev_profiles';
const DEV_WORKSPACES_KEY = 'docchase_dev_workspaces';
const DEV_MEMBERS_KEY = 'docchase_dev_workspace_members';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
  profile: Profile;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
}

export interface SignUpResult {
  session: AuthSession | null;
  needsEmailConfirmation: boolean;
  user: { id: string; email: string } | null;
}

// Helper for local mock storage in dev mode
const getDevStorage = <T>(key: string, defaultVal: T): T => {
  if (isProduction()) return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setDevStorage = <T>(key: string, val: T): void => {
  if (isProduction()) return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Failed to write to localStorage', err);
  }
};

/**
 * Safely loads workspaces for an authenticated user.
 * - Explicitly checks for errors and never treats query errors as "zero workspaces"
 * - Safe retry on transient error
 * - Direct lookup fallback if relational join workspaces(*) is null
 * - Restricts create_workspace_for_user RPC strictly to membersError === null && members.length === 0
 * - Never throws or returns null: preserves authenticated session
 */
async function loadUserWorkspaces(userId: string): Promise<Workspace[]> {
  let { data: members, error: membersError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', userId);

  // Safe retry on transient failure
  if (membersError) {
    console.warn('[authService] Error fetching workspace_members, attempting retry:', membersError.message);
    const retry = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(*)')
      .eq('user_id', userId);
    members = retry.data;
    membersError = retry.error;
  }

  // If query failed with an error, do NOT call create_workspace_for_user and do NOT assume 0 workspaces
  if (membersError) {
    console.error('[authService] Failed to load workspace_members for user:', userId, membersError);
    return [];
  }

  if (!members) {
    return [];
  }

  // Extract workspaces from relational join
  let workspaces: Workspace[] = members
    .map((m: any) => m.workspaces)
    .filter(Boolean);

  // Handle relational join failure safely:
  // If membership rows exist but nested workspaces(*) join returned null/empty
  if (members.length > 0 && workspaces.length === 0) {
    const wsIds = members.map((m: any) => m.workspace_id).filter(Boolean);
    if (wsIds.length > 0) {
      console.warn('[authService] Membership exists but nested workspaces join was empty. Performing direct lookup for IDs:', wsIds);
      const { data: directWorkspaces, error: directWsError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', wsIds);

      if (!directWsError && directWorkspaces && directWorkspaces.length > 0) {
        workspaces = directWorkspaces as Workspace[];
      } else if (directWsError) {
        console.error('[authService] Direct workspace lookup failed:', directWsError);
      }
    }
  }

  // Restrict automatic workspace creation:
  // create_workspace_for_user may ONLY be called when:
  // - membersError is strictly null
  // - members query genuinely returned 0 rows (members.length === 0)
  if (membersError === null && members.length === 0) {
    console.log('[authService] Confirmed user has 0 workspaces. Provisioning default workspace via RPC...');
    try {
      const { data: wsData, error: rpcError } = await (supabase as any).rpc('create_workspace_for_user', {
        p_user_id: userId,
        p_workspace_name: 'My Accounting Firm',
      });

      if (rpcError) {
        console.error('[authService] create_workspace_for_user RPC error:', rpcError);
      } else if (wsData) {
        workspaces.push({
          id: wsData.id,
          name: wsData.name,
          slug: wsData.slug,
          logo_url: wsData.logo_url,
          plan: wsData.plan,
          created_at: wsData.created_at,
          updated_at: wsData.updated_at,
        });
      }
    } catch (rpcErr) {
      console.error('[authService] Failed to execute create_workspace_for_user RPC:', rpcErr);
    }
  }

  return workspaces;
}

export const authService = {
  async signUp(email: string, password: string, fullName: string, firmName: string): Promise<SignUpResult> {
    assertProductionConfigured();
    if (isSupabaseConfigured()) {
      const origin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://doc-chase-omega.vercel.app';

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?verified=true`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account.');

      // In Supabase GoTrue with email confirmation enabled, when an existing email
      // signs up, Supabase returns a user with an empty identities array to prevent enumeration.
      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        const conflictErr = new Error('An account with this email already exists. Please sign in instead.');
        (conflictErr as any).code = 'user_already_exists';
        throw conflictErr;
      }

      const userId = authData.user.id;

      // In production with email confirmation enabled, authData.session is null.
      // Do NOT execute client-side authenticated RPCs as anon.
      // When the user confirms email and signs in, workspace provisioning occurs safely.
      if (!authData.session) {
        return {
          session: null,
          needsEmailConfirmation: true,
          user: { id: userId, email },
        };
      }

      // If a real session exists immediately (e.g. email confirmation disabled):
      type WorkspaceRpcResult = {
        id: string; name: string; slug: string | null; logo_url: string | null;
        plan: 'free' | 'starter' | 'pro'; created_at: string; updated_at: string;
      };
      const rpcCall = (supabase as any).rpc('create_workspace_for_user', {
        p_user_id: userId,
        p_workspace_name: firmName,
      }) as Promise<{ data: WorkspaceRpcResult | null; error: Error | null }>;
      const { data: wsData, error: wsError } = await rpcCall;

      if (wsError) throw wsError;
      if (!wsData) throw new Error('Failed to create workspace');

      const workspace = {
        id:         wsData.id,
        name:       wsData.name,
        slug:       wsData.slug,
        logo_url:   wsData.logo_url,
        plan:       wsData.plan,
        created_at: wsData.created_at,
        updated_at: wsData.updated_at,
      };

      const { data: template } = await supabase
        .from('templates')
        .insert({
          workspace_id: workspace.id,
          name: 'Monthly Bookkeeping',
          description: 'Standard monthly document collection checklist',
          frequency: 'monthly',
          is_active: true,
        })
        .select()
        .single();

      if (template) {
        await supabase.from('template_items').insert([
          { template_id: template.id, name: 'Bank Statement', description: 'Checking/Savings accounts for the period', required: true, sort_order: 1 },
          { template_id: template.id, name: 'Credit Card Statement', description: 'Monthly business credit card statements', required: true, sort_order: 2 },
          { template_id: template.id, name: 'Sales Ledger / Revenue Summary', description: 'Point of sale or invoicing summary', required: true, sort_order: 3 },
          { template_id: template.id, name: 'Expense Receipts (> $75)', description: 'Major business expense receipts and bills', required: false, sort_order: 4 },
          { template_id: template.id, name: 'Payroll Summary', description: 'Monthly payroll tax filings or register', required: true, sort_order: 5 },
        ]);
      }

      // Read back the profile created by the trigger
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const resolvedProfile = profile || {
        id: userId,
        email,
        full_name: fullName,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        session: {
          user: { id: userId, email },
          profile: resolvedProfile,
          currentWorkspace: workspace,
          workspaces: [workspace],
        },
        needsEmailConfirmation: false,
        user: { id: userId, email },
      };
    }

    // --- Dev / Local Fallback Mode ---
    const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
    const wsId = 'ws_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const profile: Profile = {
      id: userId,
      email,
      full_name: fullName,
      avatar_url: null,
      created_at: now,
      updated_at: now,
    };

    const workspace: Workspace = {
      id: wsId,
      name: firmName || 'Acorn Bookkeeping',
      slug: (firmName || 'acorn').toLowerCase().replace(/[^a-z0-9]/g, '-'),
      logo_url: null,
      plan: 'free',
      created_at: now,
      updated_at: now,
    };

    const allWorkspaces = getDevStorage<Workspace[]>(DEV_WORKSPACES_KEY, []);
    allWorkspaces.push(workspace);
    setDevStorage(DEV_WORKSPACES_KEY, allWorkspaces);

    const allMembers = getDevStorage<any[]>(DEV_MEMBERS_KEY, []);
    allMembers.push({ id: 'wm_' + Math.random().toString(36).substring(2, 9), workspace_id: wsId, user_id: userId, role: 'owner', created_at: now });
    setDevStorage(DEV_MEMBERS_KEY, allMembers);

    const allProfiles = getDevStorage<Profile[]>(DEV_PROFILES_KEY, []);
    allProfiles.push(profile);
    setDevStorage(DEV_PROFILES_KEY, allProfiles);

    const session: AuthSession = {
      user: { id: userId, email },
      profile,
      currentWorkspace: workspace,
      workspaces: [workspace],
    };

    setDevStorage(DEV_AUTH_KEY, session);
    return {
      session,
      needsEmailConfirmation: false,
      user: { id: userId, email },
    };
  },

  async signIn(email: string, password?: string): Promise<AuthSession> {
    assertProductionConfigured();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || '',
      });

      if (error) throw error;
      if (!data.user) throw new Error('User not found.');

      const userId = data.user.id;

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Fetch user workspaces with safe error handling and direct lookup fallback
      const workspaces = await loadUserWorkspaces(userId);
      const activeWorkspace = workspaces.length > 0 ? workspaces[0] : null;

      return {
        user: { id: userId, email: data.user.email || email },
        profile: profile || {
          id: userId,
          email,
          full_name: 'Accountant',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        currentWorkspace: activeWorkspace,
        workspaces,
      };
    }

    if (isProduction()) {
      throw new Error(CONFIG_ERROR_MESSAGE);
    }

    // Dev / Local Fallback Mode (Development only)
    const saved = getDevStorage<AuthSession | null>(DEV_AUTH_KEY, null);
    if (saved && saved.user.email === email) {
      return saved;
    }

    // Default seeded local session for Acorn Bookkeeping
    const userId = 'usr_sarah_101';
    const wsId = 'ws_acorn_202';
    const now = new Date().toISOString();

    const profile: Profile = {
      id: userId,
      email: email || 'sarah@acornbookkeeping.com',
      full_name: 'Sarah Jenkins',
      avatar_url: null,
      created_at: now,
      updated_at: now,
    };

    const workspace: Workspace = {
      id: wsId,
      name: 'Acorn Bookkeeping',
      slug: 'acorn-bookkeeping',
      logo_url: null,
      plan: 'free',
      created_at: now,
      updated_at: now,
    };

    const session: AuthSession = {
      user: { id: userId, email: profile.email },
      profile,
      currentWorkspace: workspace,
      workspaces: [workspace],
    };

    setDevStorage(DEV_AUTH_KEY, session);
    return session;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DEV_AUTH_KEY);
    }
  },

  async getSession(): Promise<AuthSession | null> {
    if (isProduction()) {
      assertProductionConfigured();
    }

    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) return null;

      const userId = session.user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Fetch user workspaces with safe error handling and direct lookup fallback
      const workspaces = await loadUserWorkspaces(userId);
      const activeWorkspace = workspaces.length > 0 ? workspaces[0] : null;

      // An authenticated user MUST remain authenticated even if workspaces is temporarily empty.
      // Never return null when session.user is valid!
      return {
        user: { id: userId, email: session.user.email || '' },
        profile: profile || {
          id: userId,
          email: session.user.email || '',
          full_name: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        currentWorkspace: activeWorkspace,
        workspaces,
      };
    }

    if (isProduction()) {
      return null;
    }

    return getDevStorage<AuthSession | null>(DEV_AUTH_KEY, null);
  },

  async resendConfirmationEmail(email: string): Promise<void> {
    assertProductionConfigured();
    if (isSupabaseConfigured()) {
      const origin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://doc-chase-omega.vercel.app';
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?verified=true`,
        },
      });
      if (error) throw error;
      return;
    }
  },

  async resetPassword(email: string): Promise<void> {
    assertProductionConfigured();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return;
    }

    if (isProduction()) {
      throw new Error(CONFIG_ERROR_MESSAGE);
    }
  },

  async signInWithOAuth(provider: 'google' | 'github'): Promise<void> {
    assertProductionConfigured();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return;
    }

    if (isProduction()) {
      throw new Error(CONFIG_ERROR_MESSAGE);
    }
  },
};

export function getFriendlyAuthErrorMessage(err: any): string {
  if (!err) return 'Unable to sign in right now. Please try again.';
  const code = (err.code || err.error_code || err.error || '').toString().toLowerCase();
  const msg = (err.message || err.error_description || err.msg || '').toLowerCase();
  const status = Number(err.status);

  if (
    code === 'user_already_exists' ||
    code.includes('user_already_exists') ||
    code.includes('already_registered') ||
    msg.includes('user already exists') ||
    msg.includes('already registered') ||
    msg.includes('already in use')
  ) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  if (
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    code.includes('invalid_credentials') ||
    code.includes('invalid_grant') ||
    msg.includes('invalid login credentials') ||
    msg.includes('invalid email or password') ||
    msg.includes('invalid credentials') ||
    msg.includes('invalid_grant')
  ) {
    return 'Incorrect email or password.';
  }

  if (
    code === 'email_not_confirmed' ||
    msg.includes('email not confirmed')
  ) {
    return 'Please confirm your email before signing in.';
  }

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'rate_limit_exceeded' ||
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('too many attempts') ||
    msg.includes('over_email_send_rate_limit')
  ) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  return 'Unable to sign in right now. Please try again.';
}

