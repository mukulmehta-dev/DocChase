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
  currentWorkspace: Workspace;
  workspaces: Workspace[];
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

export const authService = {
  async signUp(email: string, password: string, fullName: string, firmName: string): Promise<AuthSession> {
    assertProductionConfigured();
    if (isSupabaseConfigured()) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account.');

      const userId = authData.user.id;

      // NOTE: Profile row is created automatically by the handle_new_user trigger
      // (migration 015) which fires AFTER INSERT on auth.users with SECURITY DEFINER.
      // No INSERT on profiles is needed or performed here.

      // 1. Create workspace + owner membership + default subscription atomically via
      //    SECURITY DEFINER RPC. This bypasses the email-confirmation session gap:
      //    signUp() returns authData.user but authData.session is NULL when email
      //    confirmation is enabled in production. Direct client-side INSERTs would
      //    run as anon (no JWT) and fail the "TO authenticated" workspace RLS policy.
      //    The RPC validates p_user_id against auth.users server-side.
      type WorkspaceRpcResult = {
        id: string; name: string; slug: string | null; logo_url: string | null;
        plan: 'free' | 'starter' | 'pro'; created_at: string; updated_at: string;
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rpcCall = (supabase as any).rpc('create_workspace_for_user', {
        p_user_id: userId,
        p_workspace_name: firmName,
      }) as Promise<{ data: WorkspaceRpcResult | null; error: Error | null }>;
      const { data: wsData, error: wsError } = await rpcCall;

      if (wsError) throw wsError;
      if (!wsData) throw new Error('Failed to create workspace');

      // Normalise RPC result into the Workspace shape expected downstream
      const workspace = {
        id:         wsData.id,
        name:       wsData.name,
        slug:       wsData.slug,
        logo_url:   wsData.logo_url,
        plan:       wsData.plan,
        created_at: wsData.created_at,
        updated_at: wsData.updated_at,
      };

      // 2. Initialize starter template if we have a session (email confirmation disabled).
      //    When email confirmation is enabled, authData.session is null and the client
      //    runs as anon — template creation is skipped here and can be done on first login.
      if (authData.session) {
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
      }

      // 5. Read back the profile created by the trigger (SELECT policy: auth.uid() = id)
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
        user: { id: userId, email },
        profile: resolvedProfile,
        currentWorkspace: workspace,
        workspaces: [workspace],
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
    return session;
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

      // Fetch user workspaces
      const { data: members } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, workspaces(*)')
        .eq('user_id', userId);

      const workspaces: Workspace[] = (members || [])
        .map((m: any) => m.workspaces)
        .filter(Boolean);

      if (workspaces.length === 0) {
        // Create a default workspace if none exists yet
        const { data: newWs } = await supabase
          .from('workspaces')
          .insert({ name: 'My Accounting Firm', plan: 'free' })
          .select()
          .single();

        if (newWs) {
          await supabase.from('workspace_members').insert({
            workspace_id: newWs.id,
            user_id: userId,
            role: 'owner',
          });
          workspaces.push(newWs);
        }
      }

      const activeWorkspace = workspaces[0];

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
    localStorage.removeItem(DEV_AUTH_KEY);
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

      const { data: members } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, workspaces(*)')
        .eq('user_id', userId);

      const workspaces: Workspace[] = (members || [])
        .map((m: any) => m.workspaces)
        .filter(Boolean);

      if (!workspaces.length) return null;

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
        currentWorkspace: workspaces[0],
        workspaces,
      };
    }

    if (isProduction()) {
      return null;
    }

    return getDevStorage<AuthSession | null>(DEV_AUTH_KEY, null);
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
};
