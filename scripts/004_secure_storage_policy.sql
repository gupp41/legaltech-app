-- Secure Storage Policy for Documents
-- This script implements Row Level Security (RLS) and secure access policies

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access their own documents
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create policy: Users can only access their own storage files
-- This requires the storage bucket to be configured with RLS
-- The bucket should NOT be public

-- Note: After running this, you'll need to:
-- 1. Make the storage bucket private (remove public access)
-- 2. Update the file access logic to use signed URLs instead of public URLs
-- 3. Implement proper authentication checks in the API routes
