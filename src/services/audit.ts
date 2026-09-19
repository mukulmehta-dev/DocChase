import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { AuditLogRecord } from '../types';

export const auditService = {
  async log(
    workspaceId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    metadata: Record<string, any> = {},
    userId: string | null = null
  ): Promise<void> {
    const record = {
      workspace_id: workspaceId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('audit_logs').insert(record as any);
      } catch (err) {
        console.error('Failed to write audit log to Supabase', err);
      }
    }

    // Always append to local activity for instant UI updates
    try {
      const key = `docchase_activity_${workspaceId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const newActivity = {
        title: formatActionTitle(action, metadata),
        action,
        time: 'Just now',
        timestamp: new Date().toISOString(),
        icon: getActionIcon(action),
      };
      existing.unshift(newActivity);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
    } catch (e) {
      console.error('Local audit log write failed', e);
    }
  },

  async getLogs(workspaceId: string): Promise<AuditLogRecord[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    }

    const key = `docchase_audit_logs_${workspaceId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },
};

const formatActionTitle = (action: string, metadata: Record<string, any>): string => {
  switch (action) {
    case 'client.created':
      return `Client "${metadata.client_name}" onboarded`;
    case 'request.created':
      return `Request "${metadata.title}" created for ${metadata.client_name}`;
    case 'request.sent':
      return `Secure request dispatched to ${metadata.client_name}`;
    case 'document.uploaded':
      return `${metadata.client_name || 'Client'} uploaded ${metadata.filename}`;
    case 'document.approved':
      return `Approved "${metadata.item_name}" for ${metadata.client_name}`;
    case 'document.rejected':
      return `Flagged "${metadata.item_name}" as rejected (${metadata.reason})`;
    case 'document.replaced':
      return `Replacement uploaded for "${metadata.item_name}"`;
    case 'request.completed':
      return `Request "${metadata.title}" 100% verified — cycle READY`;
    case 'reminder.sent':
      return `Smart reminder dispatched to ${metadata.client_name} for ${metadata.count || 1} missing item(s)`;
    default:
      return action;
  }
};

const getActionIcon = (action: string): string => {
  if (action.includes('approved') || action.includes('completed')) return 'task_alt';
  if (action.includes('rejected')) return 'scan_delete';
  if (action.includes('reminder')) return 'send_time_extension';
  if (action.includes('uploaded')) return 'upload_file';
  return 'history';
};
