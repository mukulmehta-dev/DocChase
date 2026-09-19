-- ============================================================================
-- Migration 010: Add access_token column to public.requests
-- ============================================================================

-- Add access_token to public.requests to allow server-side email dispatch
-- and accountant review pane to construct authentic client portal links.
-- Protected under existing RLS policies on public.requests (workspace members only).
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS access_token TEXT;

-- Create index for quick lookup if needed
CREATE INDEX IF NOT EXISTS idx_requests_access_token ON public.requests(access_token);
