-- 🧪 MANUAL USAGE TRACKING TEST
-- This script manually tests the usage tracking system

-- Step 1: Check current state
SELECT 
    'Current State' as test_type,
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

-- Step 2: Manually simulate a document upload (replace 'your-email@example.com' with your actual email)
-- This will increment both document count and storage
UPDATE public.usage_tracking 
SET 
    documents_uploaded = documents_uploaded + 1,
    storage_used_bytes = storage_used_bytes + 1024 * 1024, -- Add 1MB
    updated_at = NOW()
WHERE user_id = (
    SELECT id FROM public.profiles 
    WHERE email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
)
AND month_year = TO_CHAR(NOW(), 'YYYY-MM');

-- Step 3: Check if the manual update worked
SELECT 
    'After Manual Update' as test_type,
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

-- Step 4: Check if the view is working
SELECT 
    'View Test' as test_type,
    user_id,
    email,
    current_plan,
    documents_uploaded,
    analyses_performed,
    storage_used_bytes,
    text_extractions
FROM user_subscription_status
LIMIT 5;

-- Step 5: Check RLS policies
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'usage_tracking';

-- Step 6: Check permissions
SELECT 
    'Permissions' as check_type,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'usage_tracking'
AND grantee = 'authenticated';

