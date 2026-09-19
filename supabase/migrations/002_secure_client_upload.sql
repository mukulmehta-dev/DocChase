-- ============================================================================
-- DOCCHASE PRODUCTION BLOCKER FIX — PHASE 1 MIGRATION
-- 002_secure_client_upload.sql
-- ============================================================================

-- 1. Ensure get_client_request_by_token returns the full typed contract
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
BEGIN
    -- Locate request by token hash
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE access_token_hash = p_token_hash AND status != 'cancelled';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid, expired, or cancelled request link.');
    END IF;

    -- Fetch client info
    SELECT id, name, company_name, email INTO v_client 
    FROM public.clients 
    WHERE id = v_request.client_id;

    -- Fetch workspace info for firm branding
    SELECT id, name, logo_url INTO v_workspace 
    FROM public.workspaces 
    WHERE id = v_request.workspace_id;

    -- Fetch request items with latest uploaded document
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
                    'uploaded_at', d.uploaded_at,
                    'storage_path', d.storage_path
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

GRANT EXECUTE ON FUNCTION public.get_client_request_by_token(TEXT) TO anon, authenticated;

-- 2. Centralized Request Readiness Calculation Function
CREATE OR REPLACE FUNCTION public.calculate_request_readiness(
    p_workspace_id UUID,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_required INT;
    v_approved_required INT;
    v_is_ready BOOLEAN;
    v_request RECORD;
BEGIN
    -- Verify request exists in workspace
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE id = p_request_id AND workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found.');
    END IF;

    -- Count required and approved items
    SELECT 
        COUNT(*) FILTER (WHERE required = true),
        COUNT(*) FILTER (WHERE required = true AND status = 'approved')
    INTO v_total_required, v_approved_required
    FROM public.request_items
    WHERE request_id = p_request_id;

    v_is_ready := (v_total_required > 0 AND v_approved_required = v_total_required);

    IF v_is_ready AND v_request.status != 'ready' THEN
        -- Mark request READY and record completion time
        UPDATE public.requests 
        SET status = 'ready', completed_at = NOW(), updated_at = NOW()
        WHERE id = p_request_id;

        -- Cancel all pending scheduled reminders for this request
        UPDATE public.reminders 
        SET status = 'cancelled', updated_at = NOW()
        WHERE request_id = p_request_id AND status = 'scheduled';

        -- Write audit log
        INSERT INTO public.audit_logs (
            workspace_id, action, target_type, target_id, details
        ) VALUES (
            p_workspace_id,
            'request.completed',
            'request',
            p_request_id,
            jsonb_build_object(
                'title', v_request.title,
                'reason', 'All required documents approved'
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_ready', v_is_ready,
        'total_required', v_total_required,
        'approved_required', v_approved_required
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_request_readiness(UUID, UUID) TO authenticated, service_role;

-- 3. Authorize Client Upload Pre-check
CREATE OR REPLACE FUNCTION public.authorize_client_upload(
    p_token_hash TEXT,
    p_request_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_item RECORD;
    v_client RECORD;
BEGIN
    -- 1. Hash/verify the supplied client token
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE access_token_hash = p_token_hash AND status != 'cancelled';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('authorized', false, 'error', 'Invalid, expired, or cancelled request link.');
    END IF;

    -- 2. Verify that the requested request_item_id belongs to that request
    SELECT * INTO v_item 
    FROM public.request_items 
    WHERE id = p_request_item_id AND request_id = v_request.id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('authorized', false, 'error', 'Document item does not belong to this request.');
    END IF;

    -- 3. Fetch client details
    SELECT id, name, email INTO v_client
    FROM public.clients
    WHERE id = v_request.client_id;

    RETURN jsonb_build_object(
        'authorized', true,
        'workspace_id', v_request.workspace_id,
        'client_id', v_request.client_id,
        'request_id', v_request.id,
        'request_item_id', v_item.id,
        'item_name', v_item.name,
        'client_name', v_client.name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authorize_client_upload(TEXT, UUID) TO anon, authenticated, service_role;

-- 4. Complete Client Upload Workflow (Atomic metadata + item update + audit + readiness)
CREATE OR REPLACE FUNCTION public.complete_client_upload(
    p_token_hash TEXT,
    p_request_item_id UUID,
    p_doc_id UUID,
    p_storage_path TEXT,
    p_filename TEXT,
    p_mime_type TEXT,
    p_file_size BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_item RECORD;
    v_client RECORD;
    v_doc RECORD;
    v_expected_path_prefix TEXT;
BEGIN
    -- 1. Verify token
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE access_token_hash = p_token_hash AND status != 'cancelled';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or revoked token.');
    END IF;

    -- 2. Verify request item belongs to request
    SELECT * INTO v_item 
    FROM public.request_items 
    WHERE id = p_request_item_id AND request_id = v_request.id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid request item.');
    END IF;

    -- 3. Verify storage path security (must match server-controlled format: workspace/client/request/doc_id/filename)
    v_expected_path_prefix := v_request.workspace_id || '/' || v_request.client_id || '/' || v_request.id || '/' || p_doc_id || '/';
    IF NOT (p_storage_path LIKE v_expected_path_prefix || '%') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Storage path violation: unauthorized path prefix.');
    END IF;

    -- 4. Validate file size (max 25MB = 26214400 bytes)
    IF p_file_size > 26214400 THEN
        RETURN jsonb_build_object('success', false, 'error', 'File exceeds maximum 25 MB size limit.');
    END IF;

    -- 5. Validate MIME type
    IF NOT (p_mime_type IN (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unsupported MIME type: ' || p_mime_type);
    END IF;

    -- 6. Insert document metadata record into public.documents
    INSERT INTO public.documents (
        id,
        workspace_id,
        client_id,
        request_id,
        request_item_id,
        storage_path,
        original_filename,
        mime_type,
        file_size,
        status,
        uploaded_at
    ) VALUES (
        p_doc_id,
        v_request.workspace_id,
        v_request.client_id,
        v_request.id,
        v_item.id,
        p_storage_path,
        p_filename,
        p_mime_type,
        p_file_size,
        'pending_review',
        NOW()
    ) RETURNING * INTO v_doc;

    -- 7. Update request item status to 'uploaded' and clear any previous rejection reason
    UPDATE public.request_items 
    SET status = 'uploaded', rejection_reason = NULL, updated_at = NOW()
    WHERE id = v_item.id;

    -- 8. If request is currently 'sent', advance to 'in_progress'
    IF v_request.status = 'sent' THEN
        UPDATE public.requests 
        SET status = 'in_progress', updated_at = NOW()
        WHERE id = v_request.id;
    END IF;

    -- 9. Get client name for audit
    SELECT name INTO v_client FROM public.clients WHERE id = v_request.client_id;

    -- 10. Write audit log
    INSERT INTO public.audit_logs (
        workspace_id, action, target_type, target_id, details
    ) VALUES (
        v_request.workspace_id,
        'document.uploaded',
        'document',
        p_doc_id,
        jsonb_build_object(
            'filename', p_filename,
            'client_name', COALESCE(v_client.name, 'Client'),
            'item_name', v_item.name
        )
    );

    -- 11. Recalculate readiness
    PERFORM public.calculate_request_readiness(v_request.workspace_id, v_request.id);

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'document_id', v_doc.id,
            'storage_path', v_doc.storage_path,
            'status', v_doc.status,
            'original_filename', v_doc.original_filename
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_client_upload(TEXT, UUID, UUID, TEXT, TEXT, TEXT, BIGINT) TO anon, authenticated, service_role;

-- 5. Harden RLS on public.documents and public.request_items
-- Ensure anon has NO direct INSERT or UPDATE privileges
REVOKE INSERT, UPDATE, DELETE ON public.documents FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.request_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.requests FROM anon;

-- Storage Bucket Hardening
UPDATE storage.buckets 
SET public = FALSE, file_size_limit = 26214400 
WHERE id = 'documents';
