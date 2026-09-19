export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanType = 'free' | 'starter' | 'pro';
export type MemberRole = 'owner' | 'admin' | 'member';
export type ClientStatus = 'active' | 'archived';
export type TemplateFrequency = 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type RequestStatus = 'draft' | 'sent' | 'in_progress' | 'ready' | 'overdue' | 'cancelled';
export type ItemStatus = 'missing' | 'uploaded' | 'approved' | 'rejected';
export type DocumentStatus = 'pending_review' | 'approved' | 'rejected';
export type ReminderStatus = 'scheduled' | 'processing' | 'sent' | 'skipped' | 'failed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          logo_url: string | null;
          plan: PlanType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          logo_url?: string | null;
          plan?: PlanType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          logo_url?: string | null;
          plan?: PlanType;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          company_name: string | null;
          email: string;
          phone: string | null;
          notes: string | null;
          status: ClientStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          company_name?: string | null;
          email: string;
          phone?: string | null;
          notes?: string | null;
          status?: ClientStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          company_name?: string | null;
          email?: string;
          phone?: string | null;
          notes?: string | null;
          status?: ClientStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          frequency: TemplateFrequency;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          frequency?: TemplateFrequency;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          frequency?: TemplateFrequency;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      template_items: {
        Row: {
          id: string;
          template_id: string;
          name: string;
          description: string | null;
          required: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          name: string;
          description?: string | null;
          required?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          name?: string;
          description?: string | null;
          required?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      requests: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string;
          template_id: string | null;
          title: string;
          period: string;
          due_date: string;
          status: RequestStatus;
          access_token: string | null;
          access_token_hash: string;
          sent_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          client_id: string;
          template_id?: string | null;
          title: string;
          period: string;
          due_date: string;
          status?: RequestStatus;
          access_token?: string | null;
          access_token_hash: string;
          sent_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          client_id?: string;
          template_id?: string | null;
          title?: string;
          period?: string;
          due_date?: string;
          status?: RequestStatus;
          access_token?: string | null;
          access_token_hash?: string;
          sent_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      request_items: {
        Row: {
          id: string;
          request_id: string;
          name: string;
          description: string | null;
          required: boolean;
          status: ItemStatus;
          rejection_reason: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          name: string;
          description?: string | null;
          required?: boolean;
          status?: ItemStatus;
          rejection_reason?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          name?: string;
          description?: string | null;
          required?: boolean;
          status?: ItemStatus;
          rejection_reason?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string;
          request_id: string;
          request_item_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          status: DocumentStatus;
          uploaded_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          client_id: string;
          request_id: string;
          request_item_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          status?: DocumentStatus;
          uploaded_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          client_id?: string;
          request_id?: string;
          request_item_id?: string;
          storage_path?: string;
          original_filename?: string;
          mime_type?: string;
          file_size?: number;
          status?: DocumentStatus;
          uploaded_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          workspace_id: string;
          request_id: string;
          scheduled_for: string;
          reminder_type: string;
          status: ReminderStatus;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          request_id: string;
          scheduled_for: string;
          reminder_type?: string;
          status?: ReminderStatus;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          request_id?: string;
          scheduled_for?: string;
          reminder_type?: string;
          status?: ReminderStatus;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: PlanType;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: PlanType;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: PlanType;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
