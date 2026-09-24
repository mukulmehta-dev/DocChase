import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Workspace } from '../types';

export interface WorkspaceMemberDetail {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  email: string;
  full_name: string | null;
}

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
  },

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberDetail[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await (supabase as any).rpc('get_workspace_members', {
        p_workspace_id: workspaceId,
      });

      if (error) throw error;
      return (data || []) as WorkspaceMemberDetail[];
    }

    const key = `docchase_dev_workspace_members_${workspaceId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Default seed for local mode
    const defaultMembers: WorkspaceMemberDetail[] = [
      {
        id: 'mem_default_owner',
        workspace_id: workspaceId,
        user_id: 'user_dev_sarah',
        role: 'owner',
        created_at: new Date().toISOString(),
        email: 'sarah@acornbookkeeping.com',
        full_name: 'Sarah Jenkins, CPA',
      },
    ];
    localStorage.setItem(key, JSON.stringify(defaultMembers));
    return defaultMembers;
  },

  async addMemberByEmail(
    workspaceId: string,
    email: string,
    role: 'owner' | 'admin' | 'member' = 'member'
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      const { data, error } = await (supabase as any).rpc('add_workspace_member_by_email', {
        p_workspace_id: workspaceId,
        p_email: email.trim(),
        p_role: role,
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to add workspace member');
      return;
    }

    const members = await this.getWorkspaceMembers(workspaceId);
    if (members.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error(`User with email ${email} is already a member of this workspace.`);
    }

    const newMember: WorkspaceMemberDetail = {
      id: 'mem_' + Math.random().toString(36).substring(2, 9),
      workspace_id: workspaceId,
      user_id: 'user_' + Math.random().toString(36).substring(2, 9),
      role,
      created_at: new Date().toISOString(),
      email: email.trim(),
      full_name: email.split('@')[0],
    };

    members.push(newMember);
    localStorage.setItem(`docchase_dev_workspace_members_${workspaceId}`, JSON.stringify(members));
  },

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    newRole: 'owner' | 'admin' | 'member'
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Member not found or unauthorized');
      return;
    }

    const members = await this.getWorkspaceMembers(workspaceId);
    const target = members.find((m) => m.id === memberId);
    if (!target) throw new Error('Member not found');

    if (target.role === 'owner' && newRole !== 'owner') {
      const remainingOwners = members.filter((m) => m.id !== memberId && m.role === 'owner');
      if (remainingOwners.length === 0) {
        throw new Error('CANNOT_DEMOTE_LAST_OWNER: Cannot demote the last remaining owner of workspace.');
      }
    }

    target.role = newRole;
    localStorage.setItem(`docchase_dev_workspace_members_${workspaceId}`, JSON.stringify(members));
  },

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return;
    }

    const members = await this.getWorkspaceMembers(workspaceId);
    const target = members.find((m) => m.id === memberId);
    if (!target) throw new Error('Member not found');

    if (target.role === 'owner') {
      const remainingOwners = members.filter((m) => m.id !== memberId && m.role === 'owner');
      if (remainingOwners.length === 0) {
        throw new Error('CANNOT_REMOVE_LAST_OWNER: Cannot delete the last remaining owner of workspace.');
      }
    }

    const filtered = members.filter((m) => m.id !== memberId);
    localStorage.setItem(`docchase_dev_workspace_members_${workspaceId}`, JSON.stringify(filtered));
  },
};

