import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Client, ClientWithRequests, PlanType } from '../types';
import { billingService } from './billing';
import { auditService } from './audit';

export const clientService = {
  async getClients(workspaceId: string): Promise<ClientWithRequests[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          requests:requests(count)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        total_requests_count: c.requests?.[0]?.count || 0,
      }));
    }

    const key = `docchase_clients_${workspaceId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  async getClient(workspaceId: string, clientId: string): Promise<Client | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error) return null;
      return data;
    }

    const clients = await this.getClients(workspaceId);
    return clients.find((c) => c.id === clientId) || null;
  },

  async createClient(
    workspaceId: string,
    plan: PlanType,
    clientData: {
      name: string;
      company_name?: string;
      email: string;
      phone?: string;
      notes?: string;
    },
    userId?: string
  ): Promise<Client> {
    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please sign in to create clients.');
      }
    }

    // 1. Enforce Plan Limits based on active clients count
    const existing = await this.getClients(workspaceId);
    const activeCount = existing.filter((c) => c.status === 'active').length;
    const limitCheck = billingService.checkClientCreationAllowed(plan, activeCount);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message);
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          workspace_id: workspaceId,
          name: clientData.name,
          company_name: clientData.company_name || null,
          email: clientData.email,
          phone: clientData.phone || null,
          notes: clientData.notes || null,
          status: 'active',
        })
        .select()
        .single();

      if (error || !data) throw error || new Error('Failed to create client');

      await auditService.log(
        workspaceId,
        'client.created',
        'client',
        data.id,
        { client_name: data.company_name || data.name },
        userId
      );

      return data;
    }

    // Local storage persistence
    const now = new Date().toISOString();
    const newClient: Client = {
      id: 'client_' + Math.random().toString(36).substring(2, 9),
      workspace_id: workspaceId,
      name: clientData.name,
      company_name: clientData.company_name || null,
      email: clientData.email,
      phone: clientData.phone || null,
      notes: clientData.notes || null,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    existing.unshift(newClient);
    localStorage.setItem(`docchase_clients_${workspaceId}`, JSON.stringify(existing));

    await auditService.log(
      workspaceId,
      'client.created',
      'client',
      newClient.id,
      { client_name: newClient.company_name || newClient.name },
      userId
    );

    return newClient;
  },

  async updateClient(
    workspaceId: string,
    clientId: string,
    updates: Partial<Client>,
    userId?: string,
    plan?: PlanType
  ): Promise<Client> {
    // Strictly prevent mutating immutable primary/foreign keys or timestamps
    const { id, workspace_id, created_at, ...safeUpdates } = updates as any;

    // If reactivating client, check active quota limit
    if (safeUpdates.status === 'active' && plan) {
      const existing = await this.getClients(workspaceId);
      const target = existing.find((c) => c.id === clientId);
      if (target && target.status !== 'active') {
        const activeCount = existing.filter((c) => c.status === 'active').length;
        const limitCheck = billingService.checkClientCreationAllowed(plan, activeCount);
        if (!limitCheck.allowed) {
          throw new Error(`Cannot reactivate client: ${limitCheck.message}`);
        }
      }
    }

    let updatedClient: Client;
    if (isSupabaseConfigured()) {
      const { data, error } = await (supabase
        .from('clients') as any)
        .update(safeUpdates)
        .eq('id', clientId)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      updatedClient = data;
    } else {
      const clients = await this.getClients(workspaceId);
      const idx = clients.findIndex((c) => c.id === clientId);
      if (idx === -1) {
        throw new Error('Client not found');
      }
      clients[idx] = { ...clients[idx], ...safeUpdates, updated_at: new Date().toISOString() };
      localStorage.setItem(`docchase_clients_${workspaceId}`, JSON.stringify(clients));
      updatedClient = clients[idx];
    }

    // Determine audit action:
    let action = 'client.updated';
    if (safeUpdates.status === 'archived') {
      action = 'client.archived';
    } else if (safeUpdates.status === 'active' && updates.status) {
      action = 'client.reactivated';
    }

    try {
      await auditService.log(
        workspaceId,
        action,
        'client',
        updatedClient.id,
        {
          client_name: updatedClient.company_name || updatedClient.name,
          changes: Object.keys(safeUpdates),
        },
        userId
      );
    } catch (auditErr) {
      console.warn('Failed to write audit log for client update', auditErr);
    }

    return updatedClient;
  },

  async deleteClient(workspaceId: string, clientId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return;
    }

    const clients = await this.getClients(workspaceId);
    const filtered = clients.filter((c) => c.id !== clientId);
    localStorage.setItem(`docchase_clients_${workspaceId}`, JSON.stringify(filtered));
  },
};
