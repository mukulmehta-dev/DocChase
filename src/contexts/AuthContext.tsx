import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../services/auth';
import type { AuthUser } from '../services/auth';
import { workspaceService } from '../services/workspaces';
import type { Profile, Workspace } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  workspaceRole: 'owner' | 'admin' | 'member' | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, firmName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateCurrentWorkspace: (updated: Partial<Workspace>) => void;
  updateProfile: (updated: Partial<Profile>) => void;
  refreshSession: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceRole, setWorkspaceRole] = useState<'owner' | 'admin' | 'member' | null>('owner');
  const [loading, setLoading] = useState(true);

  // Concurrency & race guards
  const inFlightSignInRef = useRef(false);
  const seqRef = useRef(0);

  const fetchAndSetRole = async (workspaceId: string, userId: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .maybeSingle();
        if (data?.role) {
          setWorkspaceRole(data.role as any);
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch workspace role', err);
      }
    }
    setWorkspaceRole('owner');
  };

  const updateCurrentWorkspace = (updated: Partial<Workspace>) => {
    setCurrentWorkspace((prev) => (prev ? { ...prev, ...updated } : prev));
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === currentWorkspace?.id ? { ...w, ...updated } : w))
    );
  };

  const updateProfile = (updated: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const refreshSession = async () => {
    // If an explicit signIn is already running, let it complete authoritatively
    if (inFlightSignInRef.current) return;

    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const session = await authService.getSession();
      if (seq !== seqRef.current) return; // Stale operation superseded

      if (session) {
        setUser(session.user);
        setProfile(session.profile);
        setCurrentWorkspace(session.currentWorkspace);
        setWorkspaces(session.workspaces);
        if (session.currentWorkspace && session.user) {
          fetchAndSetRole(session.currentWorkspace.id, session.user.id);
        }
      } else {
        setUser(null);
        setProfile(null);
        setCurrentWorkspace(null);
        setWorkspaces([]);
        setWorkspaceRole(null);
      }
    } catch (err) {
      console.error('Error refreshing session', err);
      if (seq === seqRef.current) {
        setUser(null);
        setProfile(null);
        setCurrentWorkspace(null);
        setWorkspaces([]);
        setWorkspaceRole(null);
      }
    } finally {
      if (seq === seqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial session load on mount
    refreshSession();

    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        if (event === 'SIGNED_IN') {
          // If an explicit signIn() is currently in-flight, it will commit state authoritatively.
          // Do NOT fire a concurrent refreshSession that races and overwrites state.
          if (inFlightSignInRef.current) {
            return;
          }
          await refreshSession();
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed in background: do not wipe workspace or cause loading flash
          // Session is still active. Only reload if user was unexpectedly missing.
          if (!user && !inFlightSignInRef.current) {
            await refreshSession();
          }
        } else if (event === 'SIGNED_OUT') {
          seqRef.current += 1;
          setUser(null);
          setProfile(null);
          setCurrentWorkspace(null);
          setWorkspaces([]);
          setWorkspaceRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password?: string) => {
    inFlightSignInRef.current = true;
    const seq = ++seqRef.current;
    try {
      const session = await authService.signIn(email, password);
      if (seq === seqRef.current) {
        // Atomic batch update for all auth parameters
        setUser(session.user);
        setProfile(session.profile);
        setCurrentWorkspace(session.currentWorkspace);
        setWorkspaces(session.workspaces);
        if (session.currentWorkspace && session.user) {
          fetchAndSetRole(session.currentWorkspace.id, session.user.id);
        }
      }
    } finally {
      inFlightSignInRef.current = false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    firmName: string
  ): Promise<{ needsEmailConfirmation: boolean }> => {
    const seq = ++seqRef.current;
    try {
      const result = await authService.signUp(email, password, fullName, firmName);
      if (seq !== seqRef.current) {
        return { needsEmailConfirmation: result.needsEmailConfirmation };
      }

      if (result.session && !result.needsEmailConfirmation) {
        setUser(result.session.user);
        setProfile(result.session.profile);
        setCurrentWorkspace(result.session.currentWorkspace);
        setWorkspaces(result.session.workspaces);
        setWorkspaceRole('owner');
      } else {
        // Email confirmation is required — user is NOT authenticated yet
        setUser(null);
        setProfile(null);
        setCurrentWorkspace(null);
        setWorkspaces([]);
        setWorkspaceRole(null);
      }
      return { needsEmailConfirmation: result.needsEmailConfirmation };
    } finally {
      // In-flight signUp completion
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    await authService.resendConfirmationEmail(email);
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    await authService.signInWithOAuth(provider);
  };

  const signOut = async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      await authService.signOut();
      if (seq === seqRef.current) {
        setUser(null);
        setProfile(null);
        setCurrentWorkspace(null);
        setWorkspaces([]);
        setWorkspaceRole(null);
      }
    } finally {
      if (seq === seqRef.current) {
        setLoading(false);
      }
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    const found = workspaces.find((w) => w.id === workspaceId);
    if (found) {
      setCurrentWorkspace(found);
      if (user) {
        fetchAndSetRole(found.id, user.id);
      }
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    if (!user) throw new Error('Must be signed in to create a workspace');
    const ws = await workspaceService.createWorkspace(user.id, name);
    setWorkspaces((prev) => [...prev, ws]);
    setCurrentWorkspace(ws);
    setWorkspaceRole('owner');
    return ws;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        currentWorkspace,
        workspaces,
        workspaceRole,
        loading,
        signIn,
        signUp,
        signOut,
        switchWorkspace,
        createWorkspace,
        updateCurrentWorkspace,
        updateProfile,
        refreshSession,
        resendConfirmationEmail,
        signInWithOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
