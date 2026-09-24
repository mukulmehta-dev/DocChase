import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DocumentRecord } from '../types';
import { auditService } from './audit';
import { emailService } from './email';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface VaultItem {
  id: string;
  requestId: string;
  requestTitle: string;
  clientId?: string;
  clientName: string;
  period: string;
  itemName: string;
  required: boolean;
  status: 'missing' | 'uploaded' | 'approved' | 'rejected';
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  rejectionReason?: string;
}

export const documentService = {
  async getVaultItems(workspaceId: string): Promise<VaultItem[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          title,
          period,
          client_id,
          created_at,
          client:clients(id, name, company_name),
          items:request_items(
            id,
            name,
            required,
            status,
            rejection_reason,
            documents(
              id,
              original_filename,
              file_size,
              uploaded_at,
              created_at
            )
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vaultItems: VaultItem[] = [];
      const requests = (data as any[]) || [];
      for (const req of requests) {
        const clientData = req.client as any;
        const clientName = clientData?.company_name || clientData?.name || 'Client';
        const items = (req.items as any[]) || [];

        for (const it of items) {
          const docs = (it.documents as any[]) || [];
          const latestDoc = docs.sort(
            (a: any, b: any) =>
              new Date(b.created_at || b.uploaded_at).getTime() -
              new Date(a.created_at || a.uploaded_at).getTime()
          )[0];

          vaultItems.push({
            id: it.id,
            requestId: req.id,
            requestTitle: req.title,
            clientId: req.client_id || clientData?.id,
            clientName,
            period: req.period,
            itemName: it.name,
            required: it.required,
            status: it.status,
            fileName: latestDoc?.original_filename,
            fileSize: latestDoc?.file_size,
            uploadedAt: latestDoc?.uploaded_at,
            rejectionReason: it.rejection_reason ?? undefined,
          });
        }
      }

      return vaultItems;
    }

    // Local Storage Mock Persistence (offline dev mode)
    const requestsKey = `docchase_requests_${workspaceId}`;
    const requests = JSON.parse(localStorage.getItem(requestsKey) || '[]');
    const allItems: VaultItem[] = [];

    for (const req of requests) {
      if (req?.items) {
        for (const it of req.items) {
          allItems.push({
            id: it.id,
            requestId: req.id,
            requestTitle: req.title,
            clientId: req.client_id || req.clientId,
            clientName: req.client_name || req.client?.name || 'Client',
            period: req.period,
            itemName: it.name,
            required: it.required,
            status: it.status,
            fileName: it.file_name || it.current_document?.original_filename,
            fileSize: it.file_size || it.current_document?.file_size,
            uploadedAt: it.uploaded_at || it.current_document?.uploaded_at,
            rejectionReason: it.rejection_reason ?? undefined,
          });
        }
      }
    }

    return allItems;
  },
  async validateFileContent(file: File): Promise<{ valid: boolean; error?: string }> {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type (${file.type || 'unknown'}). Please upload PDF, PNG, JPG, Word (.docx), or Excel (.xlsx).`,
      };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`,
      };
    }

    // Inspect magic bytes
    try {
      let headerBytes: Uint8Array;
      if (typeof file.slice === 'function') {
        const buffer = await file.slice(0, 32).arrayBuffer();
        headerBytes = new Uint8Array(buffer);
      } else {
        headerBytes = new Uint8Array(await file.arrayBuffer());
      }

      if (headerBytes.length >= 4) {
        const isPdf = headerBytes[0] === 0x25 && headerBytes[1] === 0x50 && headerBytes[2] === 0x44 && headerBytes[3] === 0x46; // %PDF
        const isJpeg = headerBytes[0] === 0xFF && headerBytes[1] === 0xD8 && headerBytes[2] === 0xFF; // JPEG
        const isPng = headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4E && headerBytes[3] === 0x47; // PNG
        const isZip = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B && headerBytes[2] === 0x03 && headerBytes[3] === 0x04; // PK.. (DOCX, XLSX)
        const isLegacyOffice = headerBytes[0] === 0xD0 && headerBytes[1] === 0xCF && headerBytes[2] === 0x11 && headerBytes[3] === 0xE0; // DOC, XLS

        if (!isPdf && !isJpeg && !isPng && !isZip && !isLegacyOffice) {
          return {
            valid: false,
            error: 'File signature verification failed. Executables or renamed invalid binaries disguised as valid files are prohibited.',
          };
        }
      }
    } catch (err) {
      console.warn('Could not inspect file signature bytes:', err);
    }

    return { valid: true };
  },

  validateFile(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type (${file.type || 'unknown'}). Please upload PDF, PNG, JPG, Word (.docx), or Excel (.xlsx).`,
      };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`,
      };
    }
    return { valid: true };
  },

  async uploadDocument(params: {
    workspaceId: string;
    clientId: string;
    requestId: string;
    requestItemId: string;
    file: File;
    token?: string;
    clientName?: string;
  }): Promise<DocumentRecord> {
    const validation = await this.validateFileContent(params.file);
    if (!validation.valid) throw new Error(validation.error);

    const docId = 'doc_' + Math.random().toString(36).substring(2, 9);
    const sanitizedFilename = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${params.workspaceId}/${params.clientId}/${params.requestId}/${docId}/${sanitizedFilename}`;

    // 1. Production / Cloud Path: Route unauthenticated client uploads through secure Edge Function
    if (isSupabaseConfigured() && params.token) {
      const formData = new FormData();
      formData.append('token', params.token);
      formData.append('request_item_id', params.requestItemId);
      formData.append('file', params.file);

      const { data, error } = await supabase.functions.invoke('client-upload', {
        body: formData,
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Server upload verification failed');
      }

      const uploadedDoc: DocumentRecord = {
        id: data.data.document_id,
        workspace_id: params.workspaceId,
        client_id: params.clientId,
        request_id: params.requestId,
        request_item_id: params.requestItemId,
        storage_path: data.data.storage_path,
        original_filename: data.data.original_filename || params.file.name,
        mime_type: params.file.type,
        file_size: params.file.size,
        status: 'pending_review',
        uploaded_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        created_at: new Date().toISOString(),
      };

      return uploadedDoc;
    }

    // 2. Direct authenticated upload (accountant upload) when configured
    if (isSupabaseConfigured()) {
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, params.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: docRecord, error: docError } = await supabase
        .from('documents')
        .insert({
          id: docId,
          workspace_id: params.workspaceId,
          client_id: params.clientId,
          request_id: params.requestId,
          request_item_id: params.requestItemId,
          storage_path: storagePath,
          original_filename: sanitizedFilename,
          mime_type: params.file.type,
          file_size: params.file.size,
          status: 'pending_review',
        })
        .select()
        .single();

      if (docError || !docRecord) throw docError || new Error('Failed to record document metadata');

      await supabase
        .from('request_items')
        .update({ status: 'uploaded', rejection_reason: null })
        .eq('id', params.requestItemId);

      await supabase
        .from('requests')
        .update({ status: 'in_progress' })
        .eq('id', params.requestId)
        .eq('status', 'sent');

      await auditService.log(
        params.workspaceId,
        'document.uploaded',
        'document',
        docRecord.id,
        {
          filename: sanitizedFilename,
          client_name: params.clientName,
        }
      );

      // Invoke authoritative readiness recalculation after successful document persistence
      await this.recalculateReadiness(params.workspaceId, params.requestId).catch((err) => {
        console.warn('Readiness recalculation notice after direct upload:', err);
      });

      return docRecord;
    }

    // 3. Local Storage Mock Persistence (offline dev mode)
    const now = new Date().toISOString();
    const docRecord: DocumentRecord = {
      id: docId,
      workspace_id: params.workspaceId,
      client_id: params.clientId,
      request_id: params.requestId,
      request_item_id: params.requestItemId,
      storage_path: storagePath,
      original_filename: sanitizedFilename,
      mime_type: params.file.type,
      file_size: params.file.size,
      status: 'pending_review',
      uploaded_at: now,
      reviewed_at: null,
      reviewed_by: null,
      created_at: now,
    };

    this.updateLocalRequestItem(params.workspaceId, params.requestId, params.requestItemId, {
      status: 'uploaded',
      rejection_reason: null,
      file_name: sanitizedFilename,
      current_document: docRecord,
    });

    await auditService.log(
      params.workspaceId,
      'document.uploaded',
      'document',
      docRecord.id,
      {
        filename: sanitizedFilename,
        client_name: params.clientName,
      }
    );

    // Invoke readiness recalculation after local mock persistence
    await this.recalculateReadiness(params.workspaceId, params.requestId);

    return docRecord;
  },

  async getSignedDocumentUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error || !data?.signedUrl) {
        throw error || new Error('Failed to generate secure signed URL for document');
      }

      return data.signedUrl;
    }

    return `data:text/plain;charset=utf-8,Mock%20Encrypted%20Document%20Content%20for%20${encodeURIComponent(storagePath)}`;
  },

  async reviewDocument(params: {
    workspaceId: string;
    requestId: string;
    requestItemId: string;
    itemName: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
    reviewerId?: string;
    clientName?: string;
    clientPortalUrl?: string;
  }): Promise<{ isReady: boolean }> {
    const isApprove = params.action === 'approve';
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      // 1. Update request item status
      await supabase
        .from('request_items')
        .update({
          status: isApprove ? 'approved' : 'rejected',
          rejection_reason: isApprove ? null : (params.rejectionReason || 'Document rejected.'),
          approved_at: isApprove ? now : null,
        })
        .eq('id', params.requestItemId);

      // 2. Update document metadata status
      await supabase
        .from('documents')
        .update({
          status: isApprove ? 'approved' : 'rejected',
          reviewed_at: now,
          reviewed_by: params.reviewerId || null,
        })
        .eq('request_item_id', params.requestItemId);

      // 3. Log audit event
      await auditService.log(
        params.workspaceId,
        isApprove ? 'document.approved' : 'document.rejected',
        'request_item',
        params.requestItemId,
        {
          item_name: params.itemName,
          reason: params.rejectionReason,
          client_name: params.clientName,
        },
        params.reviewerId
      );

      // 4. Dispatch rejection email to client if rejected
      if (!isApprove) {
        await emailService
          .sendRejectionEmail({
            workspaceId: params.workspaceId,
            requestId: params.requestId,
            requestItemId: params.requestItemId,
            rejectionReason: params.rejectionReason || 'Document requires replacement.',
            clientPortalUrl: params.clientPortalUrl,
          })
          .catch((err) => {
            console.warn('Failed to send rejection email to client:', err);
          });
      }

      // 5. Recalculate Request Readiness
      return await this.recalculateReadiness(params.workspaceId, params.requestId);
    }

    // Local storage mock
    this.updateLocalRequestItem(params.workspaceId, params.requestId, params.requestItemId, {
      status: isApprove ? 'approved' : 'rejected',
      rejection_reason: isApprove ? null : (params.rejectionReason || 'Document rejected.'),
      approved_at: isApprove ? now : null,
    });

    await auditService.log(
      params.workspaceId,
      isApprove ? 'document.approved' : 'document.rejected',
      'request_item',
      params.requestItemId,
      {
        item_name: params.itemName,
        reason: params.rejectionReason,
        client_name: params.clientName,
      },
      params.reviewerId
    );

    return await this.recalculateReadiness(params.workspaceId, params.requestId);
  },

  async recalculateReadiness(workspaceId: string, requestId: string): Promise<{ isReady: boolean }> {
    if (isSupabaseConfigured()) {
      const { data, error } = await (supabase as any).rpc('calculate_request_readiness', {
        p_workspace_id: workspaceId,
        p_request_id: requestId,
      });

      if (error) {
        console.error('Failed to calculate request readiness via RPC:', error);
        throw error;
      }

      return { isReady: Boolean(data?.is_ready) };
    }

    // Local storage mock
    const requestsKey = `docchase_requests_${workspaceId}`;
    const requests = JSON.parse(localStorage.getItem(requestsKey) || '[]');
    const req = requests.find((r: any) => r.id === requestId);

    if (req && req.items) {
      const totalItems = req.items.length;
      const requiredItems = req.items.filter((i: any) => i.required);
      const approvedCount = req.items.filter((i: any) => i.status === 'approved').length;
      const approvedRequiredCount = requiredItems.filter((i: any) => i.status === 'approved').length;

      let isReady = false;
      if (requiredItems.length > 0) {
        isReady = approvedRequiredCount === requiredItems.length;
      } else if (totalItems > 0) {
        isReady = approvedCount === totalItems;
      } else {
        isReady = false;
      }

      req.approved_count = approvedCount;
      if (isReady) {
        req.status = 'ready';
        req.completed_at = new Date().toISOString();
        await auditService.log(
          workspaceId,
          'request.completed',
          'request',
          requestId,
          { title: req.title, client_name: req.client_name }
        );
      } else {
        req.status = 'in_progress';
      }

      localStorage.setItem(requestsKey, JSON.stringify(requests));

      // Also update global store
      const globalRequests = JSON.parse(localStorage.getItem('docchase_all_requests_global') || '[]');
      const gIdx = globalRequests.findIndex((r: any) => r.id === requestId);
      if (gIdx !== -1) {
        globalRequests[gIdx] = req;
        localStorage.setItem('docchase_all_requests_global', JSON.stringify(globalRequests));
      }

      return { isReady };
    }

    return { isReady: false };
  },

  updateLocalRequestItem(
    workspaceId: string,
    requestId: string,
    itemId: string,
    updates: Record<string, any>
  ): void {
    const requestsKey = `docchase_requests_${workspaceId}`;
    const requests = JSON.parse(localStorage.getItem(requestsKey) || '[]');
    const req = requests.find((r: any) => r.id === requestId);

    if (req && req.items) {
      const item = req.items.find((i: any) => i.id === itemId);
      if (item) {
        Object.assign(item, updates);
        localStorage.setItem(requestsKey, JSON.stringify(requests));
      }
    }

    const globalRequests = JSON.parse(localStorage.getItem('docchase_all_requests_global') || '[]');
    const gReq = globalRequests.find((r: any) => r.id === requestId);
    if (gReq && gReq.items) {
      const item = gReq.items.find((i: any) => i.id === itemId);
      if (item) {
        Object.assign(item, updates);
        localStorage.setItem('docchase_all_requests_global', JSON.stringify(globalRequests));
      }
    }
  },
};
