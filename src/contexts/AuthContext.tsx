import React, { createContext, useContext, useEffect, useState } from 'react';
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
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, firmName: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      setLoading(true);
      const session = await authService.getSession();
      if (session) {
        setUser(session.user);
        setProfile(session.profile);
        setCurrentWorkspace(session.currentWorkspace);
        setWorkspaces(session.workspaces);
      } else {
        setUser(null);
        setProfile(null);
        setCurrentWorkspace(null);
        setWorkspaces([]);
      }
    } catch (err) {
      console.error('Error refreshing session', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial session load on mount
    refreshSession();

    // Subscribe to auth state changes so the app reacts to:
    //  - SIGNED_IN: email confirmation redirect, OAuth callback, session restore
    //  - TOKEN_REFRESHED: automatic token refresh
    //  - SIGNED_OUT: token expiry, explicit sign-out from another tab
    // Without this, the Supabase client may have a valid session (stored in
    // localStorage, or just parsed from the URL fragment after email confirmation)
    // but React state still shows user=null — causing all DB requests to run as
    // the anon role and producing "permission denied for table clients".
    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Session is now available — reload full session (profile + workspaces)
          await refreshSession();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setCurrentWorkspace(null);
          setWorkspaces([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const session = await authService.signIn(email, password);
      setUser(session.user);
      setProfile(session.profile);
      setCurrentWorkspace(session.currentWorkspace);
      setWorkspaces(session.workspaces);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, firmName: string) => {
    setLoading(true);
    try {
      const session = await authService.signUp(email, password, fullName, firmName);
      setUser(session.user);
      setProfile(session.profile);
      setCurrentWorkspace(session.currentWorkspace);
      setWorkspaces(session.workspaces);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setProfile(null);
      setCurrentWorkspace(null);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    const found = workspaces.find((w) => w.id === workspaceId);
    if (found) {
      setCurrentWorkspace(found);
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    if (!user) throw new Error('Must be signed in to create a workspace');
    const ws = await workspaceService.createWorkspace(user.id, name);
    setWorkspaces((prev) => [...prev, ws]);
    setCurrentWorkspace(ws);
    return ws;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        currentWorkspace,
        workspaces,
        loading,
        signIn,
        signUp,
        signOut,
        switchWorkspace,
        createWorkspace,
        refreshSession,
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
