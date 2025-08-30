-- 🚀 QUICK USAGE TRACKING FIX
-- This script quickly fixes the usage tracking issues

-- Step 1: Ensure RLS is properly configured for usage_tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop and recreate policies with proper permissions
DROP POLICY IF EXISTS "usage_tracking_select_own" ON public.usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_insert_own" ON public.usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_update_own" ON public.usage_tracking;

-- Create simple, permissive policies
CREATE POLICY "usage_tracking_select_own" ON public.usage_tracking 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_tracking_insert_own" ON public.usage_tracking 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_tracking_update_own" ON public.usage_tracking 
FOR UPDATE USING (auth.uid() = user_id);

-- Step 3: Grant proper permissions
GRANT SELECT, INSERT, UPDATE ON public.usage_tracking TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 4: Test basic functionality
-- Check if we can read from the table
SELECT 
    'Can Read' as test,
    COUNT(*) as record_count
FROM public.usage_tracking 
WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM');

-- Step 5: Show current usage data
SELECT 
    p.email,
    ut.month_year,
    ut.documents_uploaded,
    ut.analyses_performed,
    ut.storage_used_bytes,
    ut.text_extractions
FROM public.profiles p
JOIN public.usage_tracking ut ON p.id = ut.user_id
WHERE ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY ut.documents_uploaded DESC;

