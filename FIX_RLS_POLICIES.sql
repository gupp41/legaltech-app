-- 🔧 FIX RLS POLICIES FOR USAGE TRACKING
-- This script checks and fixes RLS policies that might be blocking usage tracking

-- Step 1: Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('usage_tracking', 'profiles', 'subscriptions')
ORDER BY tablename;

-- Step 2: Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('usage_tracking', 'profiles', 'subscriptions')
ORDER BY tablename, policyname;

-- Step 3: Drop and recreate usage_tracking policies with proper permissions
DROP POLICY IF EXISTS "usage_tracking_select_own" ON public.usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_insert_own" ON public.usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_update_own" ON public.usage_tracking;

-- Create more permissive policies for usage_tracking
CREATE POLICY "usage_tracking_select_own" ON public.usage_tracking 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_tracking_insert_own" ON public.usage_tracking 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_tracking_update_own" ON public.usage_tracking 
FOR UPDATE USING (auth.uid() = user_id);

-- Step 4: Ensure proper permissions are granted
GRANT SELECT, INSERT, UPDATE ON public.usage_tracking TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Test if a user can insert into usage_tracking
-- This will help identify if the issue is with RLS or something else
DO $$
DECLARE
    test_user_id UUID;
    test_month TEXT;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    test_month := TO_CHAR(NOW(), 'YYYY-MM');
    
    IF test_user_id IS NOT NULL THEN
        -- Try to insert a test record
        INSERT INTO public.usage_tracking (
            user_id, 
            month_year, 
            documents_uploaded, 
            analyses_performed, 
            storage_used_bytes, 
            text_extractions
        ) VALUES (
            test_user_id,
            test_month,
            0,
            0,
            0,
            0
        );
        
        RAISE NOTICE '✅ Test insert successful for user: %', test_user_id;
        
        -- Clean up test record
        DELETE FROM public.usage_tracking 
        WHERE user_id = test_user_id AND month_year = test_month;
        
        RAISE NOTICE '✅ Test cleanup successful';
    ELSE
        RAISE NOTICE '⚠️ No users found for testing';
    END IF;
END $$;

-- Step 6: Verify the policies are working
SELECT 
    'Policy Check' as check_type,
    tablename,
    policyname,
    permissive,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has WHERE clause'
        ELSE 'No WHERE clause'
    END as has_restrictions
FROM pg_policies 
WHERE tablename = 'usage_tracking'
ORDER BY policyname;

