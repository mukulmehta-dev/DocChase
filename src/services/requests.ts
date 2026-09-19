import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RequestRecord, RequestItem, RequestDetail, PlanType, ClientPortalData } from '../types';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { billingService } from './billing';
import { auditService } from './audit';

export const requestService = {
  async getRequests(workspaceId: string): Promise<any[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          client:clients(name, company_name, email),
          items:request_items(*)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => {
        const items: RequestItem[] = r.items || [];
        const approvedCount = items.filter((i) => i.status === 'approved').length;
        const requiredCount = items.filter((i) => i.required).length;
        return {
          ...r,
          client_name: r.client?.company_name || r.client?.name || 'Client',
          total_count: items.length,
          approved_count: approvedCount,
          required_count: requiredCount,
        };
      });
    }

    const key = `docchase_requests_${workspaceId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  async getRequestDetails(workspaceId: string, requestId: string): Promise<RequestDetail | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          client:clients(*),
          items:request_items(*, documents(*))
        `)
        .eq('id', requestId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !data) return null;
      const reqData: any = data;

      const formattedItems = (reqData.items || []).map((item: any) => {
        const docs = item.documents || [];
        const latestDoc = docs.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        return {
          ...item,
          current_document: latestDoc,
        };
      });

      return {
        ...reqData,
        items: formattedItems,
      };
    }

    const requests = await this.getRequests(workspaceId);
    return requests.find((r) => r.id === requestId) || null;
  },

  async createRequest(
    workspaceId: string,
    plan: PlanType,
    data: {
      clientId: string;
      clientName: string;
      templateId?: string;
      title: string;
      period: string;
      dueDate: string;
      items: Array<{ name: string; description?: string; required: boolean }>;
    },
    userId?: string
  ): Promise<{ request: RequestRecord; rawToken: string }> {
    // 1. Enforce Plan Limits
    const activeRequests = await this.getRequests(workspaceId);
    const inProgressCount = activeRequests.filter((r) => r.status !== 'ready' && r.status !== 'cancelled').length;
    const limitCheck = billingService.checkRequestCreationAllowed(plan, inProgressCount);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message);
    }

    // 2. Cryptographically generate unguessable secure token & hash
    const rawToken = generateSecureToken();
    const tokenHash = await hashToken(rawToken);

    if (isSupabaseConfigured()) {
      const { data: request, error: reqError } = await supabase
        .from('requests')
        .insert({
          workspace_id: workspaceId,
          client_id: data.clientId,
          template_id: data.templateId || null,
          title: data.title,
          period: data.period,
          due_date: data.dueDate,
          status: 'sent',
          access_token: rawToken,
          access_token_hash: tokenHash,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (reqError || !request) throw reqError || new Error('Failed to create request');

      // 3. Snapshot template items directly into request_items
      const itemInserts = data.items.map((item) => ({
        request_id: request.id,
        name: item.name,
        description: item.description || null,
        required: item.required,
        status: 'missing' as const,
      }));

      const { error: itemsError } = await supabase.from('request_items').insert(itemInserts);
      if (itemsError) throw itemsError;

      // 4. Schedule initial reminders
      await supabase.from('reminders').insert([
        { workspace_id: workspaceId, request_id: request.id, scheduled_for: data.dueDate, reminder_type: 'due_date', status: 'scheduled' },
      ]);

      await auditService.log(
        workspaceId,
        'request.created',
        'request',
        request.id,
        { title: data.title, client_name: data.clientName },
        userId
      );

      return { request, rawToken };
    }

    // Local Storage Mock Persistence
    const now = new Date().toISOString();
    const reqId = 'req_' + Math.random().toString(36).substring(2, 9);

    const requestItems: RequestItem[] = data.items.map((item) => ({
      id: 'ri_' + Math.random().toString(36).substring(2, 9),
      request_id: reqId,
      name: item.name,
      description: item.description || null,
      required: item.required,
      status: 'missing',
      rejection_reason: null,
      approved_at: null,
      created_at: now,
      updated_at: now,
    }));

    const newRequest: any = {
      id: reqId,
      workspace_id: workspaceId,
      client_id: data.clientId,
      client_name: data.clientName,
      template_id: data.templateId || null,
      title: data.title,
      period: data.period,
      due_date: data.dueDate,
      status: 'sent',
      access_token: rawToken,
      access_token_hash: tokenHash,
      sent_at: now,
      completed_at: null,
      created_at: now,
      updated_at: now,
      items: requestItems,
      total_count: requestItems.length,
      approved_count: 0,
      required_count: requestItems.filter((i) => i.required).length,
    };

    activeRequests.unshift(newRequest);
    localStorage.setItem(`docchase_requests_${workspaceId}`, JSON.stringify(activeRequests));

    // Also register in global client lookup store
    const globalRequests = JSON.parse(localStorage.getItem('docchase_all_requests_global') || '[]');
    globalRequests.unshift(newRequest);
    localStorage.setItem('docchase_all_requests_global', JSON.stringify(globalRequests));

    await auditService.log(
      workspaceId,
      'request.created',
      'request',
      reqId,
      { title: data.title, client_name: data.clientName },
      userId
    );

    return { request: newRequest, rawToken };
  },

  async getClientRequestByToken(token: string): Promise<ClientPortalData | null> {
    const tokenHash = await hashToken(token);

    if (isSupabaseConfigured()) {
      const { data, error }: any = await (supabase as any).rpc('get_client_request_by_token', {
        p_token_hash: tokenHash,
      });

      if (error || !data || !data.success) return null;
      return data.data as ClientPortalData;
    }

    const globalRequests = JSON.parse(localStorage.getItem('docchase_all_requests_global') || '[]');
    const found = globalRequests.find(
      (r: any) => r.access_token === token || r.access_token_hash === tokenHash
    );

    if (!found) return null;

    const workspaceClients = JSON.parse(
      localStorage.getItem(`docchase_clients_${found.workspace_id}`) || '[]'
    );
    const matchedClient = workspaceClients.find((c: any) => c.id === found.client_id);

    return {
      request: {
        id: found.id,
        workspace_id: found.workspace_id,
        client_id: found.client_id,
        title: found.title,
        period: found.period,
        due_date: found.due_date,
        status: found.status,
        sent_at: found.sent_at || null,
        completed_at: found.completed_at || null,
      },
      client: {
        id: found.client_id,
        name: found.client_name || matchedClient?.name || 'Client',
        company_name: found.company_name || matchedClient?.company_name || null,
        email: found.client_email || matchedClient?.email || '',
      },
      workspace: {
        id: found.workspace_id,
        name: 'DocChase Accounting Firm',
        logo_url: null,
      },
      items: (found.items || []).map((it: any) => ({
        id: it.id,
        name: it.name,
        description: it.description || null,
        required: Boolean(it.required),
        status: it.status,
        rejection_reason: it.rejection_reason || null,
        approved_at: it.approved_at || null,
        current_document: it.current_document || null,
      })),
    };
  },

  async cancelRequest(workspaceId: string, requestId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('workspace_id', workspaceId);

      // Cancel future scheduled reminders
      await supabase
        .from('reminders')
        .update({ status: 'cancelled' })
        .eq('request_id', requestId);

      return;
    }

    const requests = await this.getRequests(workspaceId);
    const target = requests.find((r) => r.id === requestId);
    if (target) {
      target.status = 'cancelled';
      localStorage.setItem(`docchase_requests_${workspaceId}`, JSON.stringify(requests));
    }
  },
};
