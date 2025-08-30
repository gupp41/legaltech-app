-- 🚀 COMPLETE DATABASE SETUP SCRIPT
-- This script creates ALL necessary tables for the legaltech application
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: BASIC APPLICATION SCHEMA
-- ============================================================================

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  role TEXT CHECK (role IN ('lawyer', 'hr_manager', 'legal_admin', 'paralegal')) DEFAULT 'lawyer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table for uploaded legal documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_status TEXT CHECK (upload_status IN ('uploading', 'completed', 'failed')) DEFAULT 'uploading',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analyses table for AI analysis results
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type TEXT CHECK (analysis_type IN ('contract_review', 'compliance_check', 'legal_research', 'risk_assessment')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  results JSONB,
  confidence_score DECIMAL(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create shared_documents table for document sharing
CREATE TABLE IF NOT EXISTS public.shared_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  access_level TEXT CHECK (access_level IN ('view', 'comment', 'edit')) DEFAULT 'view',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: SUBSCRIPTION SYSTEM SCHEMA
-- ============================================================================

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'plus', 'max')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one subscription per user (simplified constraint)
    UNIQUE(user_id)
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    documents_uploaded INTEGER NOT NULL DEFAULT 0,
    analyses_performed INTEGER NOT NULL DEFAULT 0,
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    text_extractions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per month
    UNIQUE(user_id, month_year)
);

-- Add subscription fields to profiles table (since we don't have a separate users table)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'free' CHECK (current_plan IN ('free', 'plus', 'max'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_end_date TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- STEP 3: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Basic schema indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_status ON public.documents(upload_status);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_document_id ON public.analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);

-- Subscription system indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_month_year ON public.usage_tracking(month_year);

-- ============================================================================
-- STEP 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for documents
CREATE POLICY "documents_select_own" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for analyses
CREATE POLICY "analyses_select_own" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "analyses_insert_own" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "analyses_update_own" ON public.analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "analyses_delete_own" ON public.analyses FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for shared_documents
CREATE POLICY "shared_documents_select_own" ON public.shared_documents FOR SELECT USING (auth.uid() = shared_by);
CREATE POLICY "shared_documents_insert_own" ON public.shared_documents FOR INSERT WITH CHECK (auth.uid() = shared_by);
CREATE POLICY "shared_documents_update_own" ON public.shared_documents FOR UPDATE USING (auth.uid() = shared_by);
CREATE POLICY "shared_documents_delete_own" ON public.shared_documents FOR DELETE USING (auth.uid() = shared_by);

-- RLS Policies for subscriptions
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for usage_tracking
CREATE POLICY "usage_tracking_select_own" ON public.usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usage_tracking_insert_own" ON public.usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usage_tracking_update_own" ON public.usage_tracking FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: HELPER FUNCTIONS
-- ============================================================================

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON public.usage_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'company_name', 'lawyer');
  
  -- Also create a default free subscription
  INSERT INTO public.subscriptions (user_id, plan_type, status, start_date)
  VALUES (NEW.id, 'free', 'active', NOW());
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to get current month usage
CREATE OR REPLACE FUNCTION get_current_month_usage(user_uuid UUID)
RETURNS TABLE (
    documents_uploaded INTEGER,
    analyses_performed INTEGER,
    storage_used_bytes BIGINT,
    text_extractions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ut.documents_uploaded, 0),
        COALESCE(ut.analyses_performed, 0),
        COALESCE(ut.storage_used_bytes, 0),
        COALESCE(ut.text_extractions, 0)
    FROM public.usage_tracking ut
    WHERE ut.user_id = user_uuid 
    AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM');
    
    -- If no record exists, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get plan limits
CREATE OR REPLACE FUNCTION get_plan_limits(plan TEXT)
RETURNS TABLE (
    max_documents INTEGER,
    max_analyses INTEGER,
    max_storage_bytes BIGINT,
    max_extractions INTEGER
) AS $$
BEGIN
    CASE plan
        WHEN 'plus' THEN
            RETURN QUERY SELECT 50, 200, 2*1024*1024*1024, 50; -- 2GB
        WHEN 'max' THEN
            RETURN QUERY SELECT 2147483647, 2147483647, 50*1024*1024*1024, 2147483647; -- 50GB, unlimited counts
        WHEN 'free' THEN
            RETURN QUERY SELECT 5, 20, 100*1024*1024, 5; -- 100MB
        ELSE
            RETURN QUERY SELECT 5, 20, 100*1024*1024, 5; -- Default to free
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shared_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.usage_tracking TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================================================
-- STEP 7: VIEWS
-- ============================================================================

-- Create view for user subscription status (updated to use profiles instead of users)
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
    p.id as user_id,
    p.email,
    p.current_plan,
    p.plan_start_date,
    p.plan_end_date,
    s.status as subscription_status,
    s.stripe_subscription_id,
    TO_CHAR(NOW(), 'YYYY-MM') as current_month,
    COALESCE(ut.documents_uploaded, 0) as documents_uploaded,
    COALESCE(ut.analyses_performed, 0) as analyses_performed,
    COALESCE(ut.storage_used_bytes, 0) as storage_used_bytes,
    COALESCE(ut.text_extractions, 0) as text_extractions
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status = 'active'
LEFT JOIN public.usage_tracking ut ON p.id = ut.user_id AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM');

-- Grant access to the view
GRANT SELECT ON user_subscription_status TO authenticated;

-- ============================================================================
-- STEP 8: INITIAL DATA
-- ============================================================================

-- Update existing profiles to have free plan if not set
UPDATE public.profiles 
SET current_plan = 'free', 
    plan_start_date = NOW()
WHERE current_plan IS NULL;

-- Insert default free subscriptions for existing users who don't have one
INSERT INTO public.subscriptions (user_id, plan_type, status, start_date)
SELECT id, 'free', 'active', NOW()
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.subscriptions WHERE status = 'active');

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This will show a success message when the script completes
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup completed successfully!';
    RAISE NOTICE '📊 Tables created: profiles, documents, analyses, shared_documents, subscriptions, usage_tracking';
    RAISE NOTICE '🔐 RLS policies enabled on all tables';
    RAISE NOTICE '🚀 Subscription system ready to use';
    RAISE NOTICE '👥 UsageDisplay component should now work properly';
END $$;
