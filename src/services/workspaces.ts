import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Workspace } from '../types';

export const workspaceService = {
  async getWorkspacesForUser(userId: string): Promise<Workspace[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role, workspaces(*)')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []).map((d: any) => d.workspaces).filter(Boolean);
    }
    const raw = localStorage.getItem('docchase_dev_workspaces');
    return raw ? JSON.parse(raw) : [];
  },

  async createWorkspace(_userId: string, name: string): Promise<Workspace> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (isSupabaseConfigured()) {
      const { data, error } = await (supabase as any).rpc('create_workspace', { p_name: name });
      if (error || !data) throw error || new Error('Failed to create workspace');
      return data as Workspace;
    }

    const newWs: Workspace = {
      id: 'ws_' + Math.random().toString(36).substring(2, 9),
      name,
      slug,
      logo_url: null,
      plan: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem('docchase_dev_workspaces') || '[]');
    existing.push(newWs);
    localStorage.setItem('docchase_dev_workspaces', JSON.stringify(existing));

    return newWs;
  },

  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<Workspace> {
    if (isSupabaseConfigured()) {
      const { data, error } = await (supabase
        .from('workspaces') as any)
        .update(updates)
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const existing = JSON.parse(localStorage.getItem('docchase_dev_workspaces') || '[]');
    const idx = existing.findIndex((w: Workspace) => w.id === workspaceId);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('docchase_dev_workspaces', JSON.stringify(existing));
      return existing[idx];
    }
    throw new Error('Workspace not found');
  }
};
