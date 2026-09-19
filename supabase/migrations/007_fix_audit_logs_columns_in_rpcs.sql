-- ============================================================================
-- Fix: Correct audit_logs column names in RPC functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_request_readiness(
    p_workspace_id UUID,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_required INT;
    v_approved_required INT;
    v_is_ready BOOLEAN;
    v_request RECORD;
BEGIN
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE id = p_request_id AND workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found.');
    END IF;

    -- Count total required items and how many of those are approved
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

        -- Write audit log using correct column names
        INSERT INTO public.audit_logs (
            workspace_id, action, entity_type, entity_id, metadata
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
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- 10. Write audit log using correct column names
    INSERT INTO public.audit_logs (
        workspace_id, action, entity_type, entity_id, metadata
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

GRANT EXECUTE ON FUNCTION public.calculate_request_readiness(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_client_upload(TEXT, UUID, UUID, TEXT, TEXT, TEXT, BIGINT) TO anon, authenticated, service_role;
