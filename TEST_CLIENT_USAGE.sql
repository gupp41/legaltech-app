-- 🧪 TEST CLIENT-SIDE USAGE TRACKING
-- This script tests if the current RLS policies allow client-side operations

-- Step 1: Check current RLS status and policies
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'usage_tracking';

SELECT 
    'Current Policies' as check_type,
    policyname,
    permissive,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has WHERE clause'
        ELSE 'No WHERE clause'
    END as restrictions
FROM pg_policies 
WHERE tablename = 'usage_tracking'
ORDER BY policyname;

-- Step 2: Check if authenticated users can read their own data
-- This simulates what the client-side code is trying to do
DO $$
DECLARE
    test_user_id UUID;
    test_month TEXT;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    test_month := TO_CHAR(NOW(), 'YYYY-MM');
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user: %', test_user_id;
        
        -- Test SELECT (should work)
        BEGIN
            PERFORM COUNT(*) FROM public.usage_tracking 
            WHERE user_id = test_user_id AND month_year = test_month;
            RAISE NOTICE '✅ SELECT test passed';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ SELECT test failed: %', SQLERRM;
        END;
        
        -- Test UPDATE (should work)
        BEGIN
            UPDATE public.usage_tracking 
            SET documents_uploaded = documents_uploaded + 1
            WHERE user_id = test_user_id AND month_year = test_month;
            RAISE NOTICE '✅ UPDATE test passed';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ UPDATE test failed: %', SQLERRM;
        END;
        
        -- Test INSERT (might fail due to unique constraint)
        BEGIN
            INSERT INTO public.usage_tracking (
                user_id, month_year, documents_uploaded, analyses_performed, 
                storage_used_bytes, text_extractions
            ) VALUES (
                test_user_id, test_month, 1, 1, 1024, 1
            );
            RAISE NOTICE '✅ INSERT test passed';
            
            -- Clean up test insert
            DELETE FROM public.usage_tracking 
            WHERE user_id = test_user_id AND month_year = test_month;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ INSERT test failed (expected if record exists): %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '⚠️ No users found for testing';
    END IF;
END $$;

-- Step 3: Show current usage data to verify it's accessible
SELECT 
    'Current Usage Data' as check_type,
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

