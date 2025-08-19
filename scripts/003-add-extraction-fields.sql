-- Add extraction-related fields to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS extraction_status text DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'queued', 'extracting', 'extracted', 'failed')),
ADD COLUMN IF NOT EXISTS extraction_job_id text,
ADD COLUMN IF NOT EXISTS extraction_started_at timestamptz,
ADD COLUMN IF NOT EXISTS extraction_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS extraction_error text,
ADD COLUMN IF NOT EXISTS extraction_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_extraction_attempts integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_extraction_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tokens_used integer DEFAULT 0;

-- Add extraction-related fields to inspection_sessions table
ALTER TABLE public.inspection_sessions
ADD COLUMN IF NOT EXISTS extraction_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_extract_on_upload boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS extraction_priority integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_extraction_check timestamptz;

-- Create index for efficient querying of extraction jobs
CREATE INDEX IF NOT EXISTS idx_documents_extraction_status ON public.documents(extraction_status);
CREATE INDEX IF NOT EXISTS idx_documents_extraction_job_id ON public.documents(extraction_job_id);
CREATE INDEX IF NOT EXISTS idx_documents_session_extraction ON public.documents(session_id, extraction_status);
CREATE INDEX IF NOT EXISTS idx_documents_priority ON public.documents(priority DESC, created_at ASC);

-- Update the session stats function to include extraction statistics
CREATE OR REPLACE FUNCTION public.update_session_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid := coalesce(new.session_id, old.session_id);
  v_total int := 0;
  v_completed int := 0;
  v_failed int := 0;
  v_processing int := 0;
  v_extracted int := 0;
  v_extraction_failed int := 0;
  v_extraction_pending int := 0;
BEGIN
  IF v_session_id IS NULL THEN
    RETURN coalesce(new, old);
  END IF;

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE status = 'completed')::int,
    count(*) FILTER (WHERE status = 'failed')::int,
    count(*) FILTER (WHERE status = 'processing')::int,
    count(*) FILTER (WHERE extraction_status = 'extracted')::int,
    count(*) FILTER (WHERE extraction_status = 'failed')::int,
    count(*) FILTER (WHERE extraction_status = 'pending')::int
  INTO v_total, v_completed, v_failed, v_processing, v_extracted, v_extraction_failed, v_extraction_pending
  FROM public.documents
  WHERE session_id = v_session_id;

  UPDATE public.inspection_sessions
     SET total_files     = coalesce(v_total, 0),
         processed_files = coalesce(v_completed, 0),
         failed_files    = coalesce(v_failed, 0),
         status = CASE
           WHEN v_processing > 0 THEN 'processing'
           WHEN v_failed > 0 AND v_completed > 0 THEN 'partial'
           WHEN v_total > 0 AND v_failed = v_total THEN 'failed'
           WHEN v_total > 0 AND v_completed = v_total THEN 'completed'
           ELSE 'processing'
         END,
         started_at = CASE
           WHEN v_total > 0 AND started_at IS NULL THEN now()
           ELSE started_at
         END,
         completed_at = CASE
           WHEN v_total > 0 AND v_processing = 0 THEN now()
           ELSE completed_at
         END,
         updated_at = now()
   WHERE id = v_session_id;

  RETURN coalesce(new, old);
END;
$$;

-- Function to get documents ready for extraction
CREATE OR REPLACE FUNCTION public.get_documents_for_extraction(
  p_limit integer DEFAULT 10,
  p_session_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  session_id uuid,
  filename text,
  upload_url text,
  priority integer,
  extraction_attempts integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.session_id,
    d.filename,
    d.upload_url,
    d.priority,
    d.extraction_attempts,
    d.created_at
  FROM public.documents d
  JOIN public.inspection_sessions s ON d.session_id = s.id
  WHERE 
    d.status = 'uploaded'
    AND d.upload_url IS NOT NULL
    AND d.extraction_status IN ('pending', 'failed')
    AND d.extraction_attempts < d.max_extraction_attempts
    AND (p_session_id IS NULL OR d.session_id = p_session_id)
    AND (s.extraction_enabled = true OR d.manual_extraction_requested = true)
  ORDER BY 
    d.priority DESC,
    d.manual_extraction_requested DESC,
    d.created_at ASC
  LIMIT p_limit;
END;
$$;

-- Function to mark document as queued for extraction
CREATE OR REPLACE FUNCTION public.mark_document_queued(
  p_document_id uuid,
  p_job_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.documents
  SET 
    extraction_status = 'queued',
    extraction_job_id = p_job_id,
    extraction_started_at = now(),
    updated_at = now()
  WHERE 
    id = p_document_id
    AND extraction_status IN ('pending', 'failed');
    
  RETURN FOUND;
END;
$$;

-- Function to mark document extraction as started
CREATE OR REPLACE FUNCTION public.mark_extraction_started(
  p_document_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.documents
  SET 
    extraction_status = 'extracting',
    extraction_attempts = extraction_attempts + 1,
    updated_at = now()
  WHERE 
    id = p_document_id
    AND extraction_status = 'queued';
    
  RETURN FOUND;
END;
$$;

-- Function to mark document extraction as completed
CREATE OR REPLACE FUNCTION public.mark_extraction_completed(
  p_document_id uuid,
  p_extracted_data jsonb,
  p_tokens_used integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.documents
  SET 
    extraction_status = 'extracted',
    extraction_completed_at = now(),
    extracted_data = p_extracted_data,
    tokens_used = p_tokens_used,
    status = 'completed',
    manual_extraction_requested = false,
    extraction_job_id = NULL,
    extraction_error = NULL,
    updated_at = now()
  WHERE 
    id = p_document_id
    AND extraction_status = 'extracting';
    
  RETURN FOUND;
END;
$$;

-- Function to mark document extraction as failed
CREATE OR REPLACE FUNCTION public.mark_extraction_failed(
  p_document_id uuid,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.documents
  SET 
    extraction_status = CASE 
      WHEN extraction_attempts >= max_extraction_attempts THEN 'failed'
      ELSE 'pending'
    END,
    extraction_error = p_error_message,
    extraction_job_id = NULL,
    status = CASE 
      WHEN extraction_attempts >= max_extraction_attempts THEN 'failed'
      ELSE status
    END,
    updated_at = now()
  WHERE 
    id = p_document_id
    AND extraction_status = 'extracting';
    
  RETURN FOUND;
END;
$$;

-- Function to request manual extraction for a document
CREATE OR REPLACE FUNCTION public.request_manual_extraction(
  p_document_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.documents
  SET 
    manual_extraction_requested = true,
    extraction_status = 'pending',
    priority = 100, -- High priority for manual requests
    updated_at = now()
  WHERE 
    id = p_document_id
    AND user_id = p_user_id
    AND extraction_status != 'extracted';
    
  RETURN FOUND;
END;
$$;

-- Function to enable extraction for a session
CREATE OR REPLACE FUNCTION public.enable_session_extraction(
  p_session_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inspection_sessions
  SET 
    extraction_enabled = true,
    updated_at = now()
  WHERE 
    id = p_session_id
    AND user_id = p_user_id;
    
  RETURN FOUND;
END;
$$;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION public.get_documents_for_extraction TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_document_queued TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_extraction_started TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_extraction_completed TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_extraction_failed TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_manual_extraction TO authenticated;
GRANT EXECUTE ON FUNCTION public.enable_session_extraction TO authenticated;
