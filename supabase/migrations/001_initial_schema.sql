-- ============================================================================
-- DocChase — Master Database Schema & Row Level Security (RLS)
-- Version: 1.0.0
-- Description: Complete 13 core tables, indexes, triggers, and workspace isolation
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Profiles Table (Accountants & Team Members)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Workspaces Table (Accounting / Bookkeeping Firms)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Workspace Members Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 4. Clients Table (Clients of the Accounting Firm)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. Templates Table (Recurring Document Request Checklists)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'yearly', 'custom')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. Template Items Table (Individual Requested Document Slots)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. Requests Table (Active Document Collection Cycles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    period TEXT NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'ready', 'overdue', 'cancelled')),
    access_token_hash TEXT NOT NULL UNIQUE,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. Request Items Table (Snapshot of Requested Documents for this Request)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'uploaded', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. Documents Table (Uploaded Files & Audit History)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    request_item_id UUID NOT NULL REFERENCES public.request_items(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. Reminders Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    reminder_type TEXT NOT NULL DEFAULT 'email',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'skipped', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. Notifications Table (Accountant In-App Activity Feed)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12. Subscriptions Table (Stripe Billing Integration)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. Audit Logs Table (Full Traceability for Documents & Actions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_workspace ON public.clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_templates_workspace ON public.templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template ON public.template_items(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_requests_workspace ON public.requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_requests_client ON public.requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_token_hash ON public.requests(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_requests_status_due ON public.requests(status, due_date);
CREATE INDEX IF NOT EXISTS idx_request_items_request ON public.request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_status ON public.request_items(status);
CREATE INDEX IF NOT EXISTS idx_documents_request_item ON public.documents(request_item_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reminders_ws_status ON public.reminders(workspace_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_ws_user ON public.notifications(workspace_id, user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ws ON public.audit_logs(workspace_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- ============================================================================

-- Function: Get list of workspace IDs for current authenticated user
CREATE OR REPLACE FUNCTION public.current_user_workspace_ids()
RETURNS TABLE (workspace_id UUID) 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT wm.workspace_id 
    FROM public.workspace_members wm 
    WHERE wm.user_id = auth.uid();
$$;

-- Function: Check if current user is member of a specific workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.workspace_members wm 
        WHERE wm.workspace_id = ws_id AND wm.user_id = auth.uid()
    );
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 2. Workspaces Policies
CREATE POLICY "Workspace members can view workspace" 
    ON public.workspaces FOR SELECT 
    USING (id IN (SELECT current_user_workspace_ids()));

CREATE POLICY "Authenticated users can create workspace" 
    ON public.workspaces FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Workspace owners can update workspace" 
    ON public.workspaces FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 3. Workspace Members Policies
CREATE POLICY "Members can view other members in their workspace" 
    ON public.workspace_members FOR SELECT 
    USING (workspace_id IN (SELECT current_user_workspace_ids()));

CREATE POLICY "Owners can manage members" 
    ON public.workspace_members FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = public.workspace_members.workspace_id 
              AND user_id = auth.uid() 
              AND role = 'owner'
        )
    );

-- 4. Clients Policies
CREATE POLICY "Workspace members can manage clients" 
    ON public.clients FOR ALL 
    USING (workspace_id IN (SELECT current_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

-- 5. Templates Policies
CREATE POLICY "Workspace members can manage templates" 
    ON public.templates FOR ALL 
    USING (workspace_id IN (SELECT current_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

-- 6. Template Items Policies
CREATE POLICY "Workspace members can manage template items" 
    ON public.template_items FOR ALL 
    USING (
        template_id IN (
            SELECT id FROM public.templates WHERE workspace_id IN (SELECT current_user_workspace_ids())
        )
    )
    WITH CHECK (
        template_id IN (
            SELECT id FROM public.templates WHERE workspace_id IN (SELECT current_user_workspace_ids())
        )
    );

-- 7. Requests Policies
CREATE POLICY "Workspace members can manage requests" 
    ON public.requests FOR ALL 
    USING (workspace_id IN (SELECT current_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

-- 8. Request Items Policies
CREATE POLICY "Workspace members can manage request items" 
    ON public.request_items FOR ALL 
    USING (
        request_id IN (
            SELECT id FROM public.requests WHERE workspace_id IN (SELECT current_user_workspace_ids())
        )
    )
    WITH CHECK (
        request_id IN (
            SELECT id FROM public.requests WHERE workspace_id IN (SELECT current_user_workspace_ids())
        )
    );

-- 9. Documents Policies
CREATE POLICY "Workspace members can manage documents" 
    ON public.documents FOR ALL 
    USING (workspace_id IN (SELECT current_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

-- 10. Reminders Policies
CREATE POLICY "Workspace members can manage reminders" 
    ON public.reminders FOR ALL 
    USING (workspace_id IN (SELECT current_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

-- 11. Notifications Policies
CREATE POLICY "Workspace members can manage their notifications" 
    ON public.notifications FOR ALL 
    USING (user_id = auth.uid() AND workspace_id IN (SELECT current_user_workspace_ids()))
    WITH CHECK (user_id = auth.uid() AND workspace_id IN (SELECT current_user_workspace_ids()));

-- 12. Subscriptions Policies
CREATE POLICY "Workspace members can view subscriptions" 
    ON public.subscriptions FOR SELECT 
    USING (workspace_id IN (SELECT current_user_workspace_ids()));

-- 13. Audit Logs Policies
CREATE POLICY "Workspace members can view audit logs" 
    ON public.audit_logs FOR SELECT 
    USING (workspace_id IN (SELECT current_user_workspace_ids()));

CREATE POLICY "System/members can insert audit logs" 
    ON public.audit_logs FOR INSERT 
    WITH CHECK (workspace_id IN (SELECT current_user_workspace_ids()));

-- ============================================================================
-- SECURE CLIENT PORTAL RPC (NO DIRECT TABLE SCAN BY PUBLIC CLIENTS)
-- ============================================================================

-- Function: Client portal lookup by cryptographically secure SHA-256 token hash
CREATE OR REPLACE FUNCTION public.get_client_request_by_token(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_client RECORD;
    v_workspace RECORD;
    v_items JSONB;
    v_docs JSONB;
BEGIN
    -- Locate request by token hash
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE access_token_hash = p_token_hash AND status != 'cancelled';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid, expired, or cancelled request link.');
    END IF;

    -- Fetch client info (restricted to public display fields)
    SELECT id, name, company_name, email INTO v_client 
    FROM public.clients 
    WHERE id = v_request.client_id;

    -- Fetch workspace info for firm branding
    SELECT id, name, logo_url INTO v_workspace 
    FROM public.workspaces 
    WHERE id = v_request.workspace_id;

    -- Fetch request items
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', ri.id,
            'name', ri.name,
            'description', ri.description,
            'required', ri.required,
            'status', ri.status,
            'rejection_reason', ri.rejection_reason,
            'approved_at', ri.approved_at,
            'current_document', (
                SELECT jsonb_build_object(
                    'id', d.id,
                    'original_filename', d.original_filename,
                    'file_size', d.file_size,
                    'mime_type', d.mime_type,
                    'status', d.status,
                    'uploaded_at', d.uploaded_at
                )
                FROM public.documents d
                WHERE d.request_item_id = ri.id
                ORDER BY d.created_at DESC
                LIMIT 1
            )
        ) ORDER BY ri.created_at ASC
    ) INTO v_items
    FROM public.request_items ri
    WHERE ri.request_id = v_request.id;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'request', jsonb_build_object(
                'id', v_request.id,
                'workspace_id', v_request.workspace_id,
                'client_id', v_request.client_id,
                'title', v_request.title,
                'period', v_request.period,
                'due_date', v_request.due_date,
                'status', v_request.status,
                'sent_at', v_request.sent_at,
                'completed_at', v_request.completed_at
            ),
            'client', jsonb_build_object(
                'id', v_client.id,
                'name', v_client.name,
                'company_name', v_client.company_name,
                'email', v_client.email
            ),
            'workspace', jsonb_build_object(
                'id', v_workspace.id,
                'name', v_workspace.name,
                'logo_url', v_workspace.logo_url
            ),
            'items', COALESCE(v_items, '[]'::jsonb)
        )
    );
END;
$$;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_client_request_by_token(TEXT) TO anon, authenticated;

-- ============================================================================
-- AUTOMATIC TIMESTAMP UPDATERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_request_items_updated_at BEFORE UPDATE ON public.request_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- STORAGE SETUP (Private Document Vault)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    FALSE,
    26214400, -- 25 MB max per file
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 26214400;

-- Storage RLS
CREATE POLICY "Accountants can read documents from their workspace"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspace_ids())
);

CREATE POLICY "Accountants can manage documents in their workspace"
ON storage.objects FOR ALL
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspace_ids())
)
WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspace_ids())
);
