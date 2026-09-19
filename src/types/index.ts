import type { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Template = Database['public']['Tables']['templates']['Row'];
export type TemplateItem = Database['public']['Tables']['template_items']['Row'];
export type RequestRecord = Database['public']['Tables']['requests']['Row'];
export type RequestItem = Database['public']['Tables']['request_items']['Row'];
export type DocumentRecord = Database['public']['Tables']['documents']['Row'];
export type ReminderRecord = Database['public']['Tables']['reminders']['Row'];
export type NotificationRecord = Database['public']['Tables']['notifications']['Row'];
export type SubscriptionRecord = Database['public']['Tables']['subscriptions']['Row'];
export type AuditLogRecord = Database['public']['Tables']['audit_logs']['Row'];

export type PlanType = Database['public']['Tables']['workspaces']['Row']['plan'];
export type RequestStatus = Database['public']['Tables']['requests']['Row']['status'];
export type ItemStatus = Database['public']['Tables']['request_items']['Row']['status'];
export type TemplateFrequency = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface TemplateWithItems extends Template {
  items: TemplateItem[];
}

export interface RequestItemWithDoc extends RequestItem {
  current_document?: {
    id: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    status: string;
    uploaded_at: string;
    download_url?: string;
  };
}

export interface RequestDetail extends RequestRecord {
  client?: Client;
  items: RequestItemWithDoc[];
}

export interface ClientWithRequests extends Client {
  active_requests_count?: number;
  total_requests_count?: number;
  latest_request?: RequestRecord;
}

export interface ClientPortalItem {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  status: ItemStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  current_document?: {
    id: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    status: string;
    uploaded_at: string;
    storage_path?: string;
  } | null;
}

export interface ClientPortalData {
  request: {
    id: string;
    workspace_id: string;
    client_id: string;
    title: string;
    period: string;
    due_date: string;
    status: RequestStatus;
    sent_at: string | null;
    completed_at: string | null;
  };
  client: {
    id?: string;
    name: string;
    company_name: string | null;
    email: string;
  };
  workspace: {
    id?: string;
    name: string;
    logo_url: string | null;
  };
  items: ClientPortalItem[];
}

export type ClientPortalPayload = ClientPortalData;

export interface ClientPortalResponse {
  success: boolean;
  data?: ClientPortalData;
  error?: string;
}

export interface ReadinessSummary {
  total_items: number;
  required_items: number;
  approved_items: number;
  uploaded_items: number;
  missing_items: number;
  rejected_items: number;
  completion_percentage: number;
  is_ready: boolean;
}

export interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  refreshWorkspaces: () => Promise<void>;
}
