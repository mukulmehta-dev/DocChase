import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ReminderRecord } from '../types';
import { auditService } from './audit';
import { emailService } from './email';

export interface SmartReminderPayload {
  requestId: string;
  clientName: string;
  clientEmail: string;
  requestTitle: string;
  dueDate: string;
  outstandingItems: string[];
}

export const reminderService = {
  async getReminders(workspaceId: string): Promise<ReminderRecord[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data || [];
    }

    const key = `docchase_reminders_${workspaceId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  async sendSmartReminder(params: {
    workspaceId: string;
    requestId: string;
    clientName: string;
    clientEmail: string;
    requestTitle: string;
    dueDate: string;
    outstandingItems: string[];
    clientPortalUrl?: string;
  }): Promise<{ success: boolean; stopped: boolean; itemCount: number; message: string }> {
    // 1. Core stop rule check: If 0 items outstanding, never send reminder!
    if (params.outstandingItems.length === 0) {
      return {
        success: false,
        stopped: true,
        itemCount: 0,
        message: 'All requested documents have been approved or provided. Reminder skipped.',
      };
    }

    if (isSupabaseConfigured()) {
      const dispatchResult = await emailService.sendReminderEmail({
        workspaceId: params.workspaceId,
        requestId: params.requestId,
        clientPortalUrl: params.clientPortalUrl,
      });

      if (dispatchResult.stopped) {
        return {
          success: false,
          stopped: true,
          itemCount: params.outstandingItems.length,
          message: dispatchResult.message || 'Reminder skipped: request is ready or no items missing.',
        };
      }

      if (!dispatchResult.success) {
        return {
          success: false,
          stopped: false,
          itemCount: params.outstandingItems.length,
          message: dispatchResult.error || 'Failed to dispatch reminder email via Resend.',
        };
      }

      return {
        success: true,
        stopped: false,
        itemCount: params.outstandingItems.length,
        message: `Smart reminder successfully delivered to ${params.clientEmail} via Resend.`,
      };
    }

    // Local storage mock fallback
    const requestsKey = `docchase_requests_${params.workspaceId}`;
    const requests = JSON.parse(localStorage.getItem(requestsKey) || '[]');
    const req = requests.find((r: any) => r.id === params.requestId);
    if (req?.status === 'ready') {
      return {
        success: false,
        stopped: true,
        itemCount: 0,
        message: 'Request is ready. Scheduled reminders have stopped.',
      };
    }

    await auditService.log(
      params.workspaceId,
      'reminder.sent',
      'request',
      params.requestId,
      {
        client_name: params.clientName,
        count: params.outstandingItems.length,
        items: params.outstandingItems,
      }
    );

    return {
      success: true,
      stopped: false,
      itemCount: params.outstandingItems.length,
      message: `[Local Dev] Smart reminder dispatched to ${params.clientEmail} targeting ${params.outstandingItems.length} missing document(s).`,
    };
  },
};
