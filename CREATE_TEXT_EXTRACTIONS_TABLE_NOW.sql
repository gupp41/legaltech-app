-- CREATE_TEXT_EXTRACTIONS_TABLE_NOW.sql
-- This script creates the text_extractions table immediately

-- Create the text_extractions table
CREATE TABLE IF NOT EXISTS public.text_extractions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    extracted_text TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    extraction_method VARCHAR(50) DEFAULT 'pdf_extraction',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_text_extractions_user_id ON public.text_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_text_extractions_document_id ON public.text_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_text_extractions_created_at ON public.text_extractions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.text_extractions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "text_extractions_select_own" ON public.text_extractions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "text_extractions_insert_own" ON public.text_extractions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "text_extractions_update_own" ON public.text_extractions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "text_extractions_delete_own" ON public.text_extractions FOR DELETE USING (auth.uid() = user_id);

-- Verify the table was created
SELECT '=== TEXT_EXTRACTIONS TABLE CREATED ===' as info;
SELECT 
    table_name,
    table_type,
    is_insertable_into
FROM information_schema.tables 
WHERE table_name = 'text_extractions' AND table_schema = 'public';
