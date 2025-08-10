-- Create inspection_sessions table
CREATE TABLE IF NOT EXISTS public.inspection_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_name TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed', 'partial')),
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update documents table to link to sessions
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.inspection_sessions(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_user_id ON public.inspection_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_session_id ON public.documents(session_id);

-- Enable RLS on inspection_sessions
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inspection_sessions
CREATE POLICY "Users can view own sessions" ON public.inspection_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.inspection_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.inspection_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update session statistics
CREATE OR REPLACE FUNCTION public.update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session statistics when documents change
    UPDATE public.inspection_sessions 
    SET 
        total_files = (
            SELECT COUNT(*) 
            FROM public.documents 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        ),
        processed_files = (
            SELECT COUNT(*) 
            FROM public.documents 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
            AND status = 'completed'
        ),
        failed_files = (
            SELECT COUNT(*) 
            FROM public.documents 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
            AND status = 'failed'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.session_id, OLD.session_id);
    
    -- Update session status based on document statuses
    UPDATE public.inspection_sessions 
    SET status = CASE 
        WHEN (SELECT COUNT(*) FROM public.documents WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) AND status = 'processing') > 0 THEN 'processing'
        WHEN (SELECT COUNT(*) FROM public.documents WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) AND status = 'failed') > 0 
             AND (SELECT COUNT(*) FROM public.documents WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) AND status = 'completed') > 0 THEN 'partial'
        WHEN (SELECT COUNT(*) FROM public.documents WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) AND status = 'failed') = 
             (SELECT COUNT(*) FROM public.documents WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)) THEN 'failed'
        WHEN (SELECT COUNT(*) FROM public.documents WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) AND status = 'completed') = 
             (SELECT COUNT(*) FROM public.documents WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)) THEN 'completed'
        ELSE 'processing'
    END,
    completed_at = CASE 
        WHEN (SELECT COUNT(*) FROM public.documents WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) AND status IN ('processing')) = 0 
        THEN NOW()
        ELSE completed_at
    END
    WHERE id = COALESCE(NEW.session_id, OLD.session_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for session statistics
DROP TRIGGER IF EXISTS update_session_stats_trigger ON public.documents;
CREATE TRIGGER update_session_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_session_stats();

-- Create trigger for updated_at on sessions
DROP TRIGGER IF EXISTS update_inspection_sessions_updated_at ON public.inspection_sessions;
CREATE TRIGGER update_inspection_sessions_updated_at
    BEFORE UPDATE ON public.inspection_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
