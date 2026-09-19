// Supabase Edge Function: client-upload
// Implements secure server-side client upload verification and file ingestion

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate file magic bytes (file signature verification)
function validateMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 4) return false;

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return true;
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return true;
  }

  // PNG: 0x89 0x50 0x4E 0x47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return true;
  }

  // ZIP-based Office documents (DOCX, XLSX): PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return true;
  }

  // Legacy Office: 0xD0 0xCF 0x11 0xE0
  if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
    return true;
  }

  return false;
}

// Compute SHA-256 hash of access token
async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const formData = await req.formData();
    const token = formData.get('token') as string | null;
    const requestItemId = formData.get('request_item_id') as string | null;
    const file = formData.get('file') as File | null;

    if (!token || !requestItemId || !file) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required upload parameters (token, request_item_id, file).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed 25 MB.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported file type (${file.type}). Allowed types: PDF, PNG, JPG, DOCX, XLSX.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Inspect magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 32));
    if (!validateMagicBytes(headerBytes, file.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File signature verification failed. Executables or mismatched binaries disguised as valid files are prohibited.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Hash token and authorize upload via database RPC
    const tokenHash = await hashToken(token);
    const { data: authResult, error: authError } = await supabase.rpc('authorize_client_upload', {
      p_token_hash: tokenHash,
      p_request_item_id: requestItemId,
    });

    if (authError || !authResult?.authorized) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authResult?.error || authError?.message || 'Unauthorized: invalid token or document item.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { workspace_id, client_id, request_id } = authResult;

    // 5. Generate server-controlled document ID and sanitize filename
    const documentId = crypto.randomUUID();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${workspace_id}/${client_id}/${request_id}/${documentId}/${sanitizedFilename}`;

    // 6. Upload file directly to private 'documents' storage bucket
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ success: false, error: `Storage upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Atomically record metadata, update item status, log audit event, and recalculate readiness
    const { data: completeResult, error: completeError } = await supabase.rpc('complete_client_upload', {
      p_token_hash: tokenHash,
      p_request_item_id: requestItemId,
      p_doc_id: documentId,
      p_storage_path: storagePath,
      p_filename: sanitizedFilename,
      p_mime_type: file.type,
      p_file_size: file.size,
    });

    if (completeError || !completeResult?.success) {
      // Clean up orphaned storage object if metadata recording failed
      await supabase.storage.from('documents').remove([storagePath]);

      return new Response(
        JSON.stringify({
          success: false,
          error: completeResult?.error || completeError?.message || 'Failed to complete document recording.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: completeResult.data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
