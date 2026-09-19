import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface EmailDispatchResult {
  success: boolean;
  stopped?: boolean;
  configured?: boolean;
  message?: string;
  error?: string;
  resendId?: string;
}

export const emailService = {
  /**
   * Dispatches initial document request invitation email to the client
   */
  async sendInitialRequestEmail(params: {
    workspaceId: string;
    requestId: string;
    clientPortalUrl?: string;
  }): Promise<EmailDispatchResult> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          workspace_id: params.workspaceId,
          request_id: params.requestId,
          type: 'initial_request',
          client_portal_url: params.clientPortalUrl,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to dispatch initial request email.',
        };
      }

      if (!data?.success) {
        return {
          success: false,
          configured: data?.configured !== false,
          error: data?.error || 'Email dispatch rejected by server.',
        };
      }

      return {
        success: true,
        message: data.message || 'Invitation email dispatched to client.',
        resendId: data.data?.resend_id,
      };
    }

    return {
      success: true,
      message: 'Local development: simulated email dispatch.',
    };
  },

  /**
   * Dispatches smart reminder email for outstanding missing or rejected documents
   */
  async sendReminderEmail(params: {
    workspaceId: string;
    requestId: string;
    clientPortalUrl?: string;
  }): Promise<EmailDispatchResult> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          workspace_id: params.workspaceId,
          request_id: params.requestId,
          type: 'reminder',
          client_portal_url: params.clientPortalUrl,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to dispatch reminder email.',
        };
      }

      if (data?.stopped) {
        return {
          success: false,
          stopped: true,
          message: data.message || data.error || 'Reminder skipped: all documents approved.',
        };
      }

      if (!data?.success) {
        return {
          success: false,
          configured: data?.configured !== false,
          error: data?.error || 'Reminder dispatch rejected by server.',
        };
      }

      return {
        success: true,
        message: data.message || 'Reminder email dispatched to client.',
        resendId: data.data?.resend_id,
      };
    }

    return {
      success: true,
      message: 'Local development: simulated reminder email dispatch.',
    };
  },

  /**
   * Dispatches replacement request email when an accountant rejects a document
   */
  async sendRejectionEmail(params: {
    workspaceId: string;
    requestId: string;
    requestItemId: string;
    rejectionReason: string;
    clientPortalUrl?: string;
  }): Promise<EmailDispatchResult> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          workspace_id: params.workspaceId,
          request_id: params.requestId,
          type: 'document_rejected',
          request_item_id: params.requestItemId,
          rejection_reason: params.rejectionReason,
          client_portal_url: params.clientPortalUrl,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to dispatch document rejection email.',
        };
      }

      if (!data?.success) {
        return {
          success: false,
          configured: data?.configured !== false,
          error: data?.error || 'Rejection email dispatch rejected by server.',
        };
      }

      return {
        success: true,
        message: data.message || 'Document replacement request dispatched to client.',
        resendId: data.data?.resend_id,
      };
    }

    return {
      success: true,
      message: 'Local development: simulated document rejection email dispatch.',
    };
  },
};
