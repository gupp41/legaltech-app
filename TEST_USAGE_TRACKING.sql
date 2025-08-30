-- 🧪 TEST USAGE TRACKING
-- This script tests the usage tracking system to ensure it's working properly

-- Step 1: Check current usage for all users
SELECT 
    'Current Usage Status' as test_type,
    p.email,
    p.current_plan,
    ut.month_year,
    ut.documents_uploaded,
    ut.analyses_performed,
    ut.storage_used_bytes,
    ut.text_extractions
FROM public.profiles p
JOIN public.usage_tracking ut ON p.id = ut.user_id
WHERE ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY ut.documents_uploaded DESC;

-- Step 2: Manually increment usage for testing (replace 'your-email@example.com' with your actual email)
-- This simulates what happens when you perform actions
UPDATE public.usage_tracking 
SET 
    documents_uploaded = documents_uploaded + 1,
    analyses_performed = analyses_performed + 1,
    text_extractions = text_extractions + 1,
    updated_at = NOW()
WHERE user_id = (
    SELECT id FROM public.profiles 
    WHERE email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
)
AND month_year = TO_CHAR(NOW(), 'YYYY-MM');

-- Step 3: Check if the update worked
SELECT 
    'After Manual Update' as test_type,
    p.email,
    p.current_plan,
    ut.month_year,
    ut.documents_uploaded,
    ut.analyses_performed,
    ut.storage_used_bytes,
    ut.text_extractions
FROM public.profiles p
JOIN public.usage_tracking ut ON p.id = ut.user_id
WHERE ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY ut.documents_uploaded DESC;

-- Step 4: Test the view
SELECT 
    'View Test' as test_type,
    COUNT(*) as total_records,
    SUM(documents_uploaded) as total_docs,
    SUM(analyses_performed) as total_analyses,
    SUM(text_extractions) as total_extractions
FROM user_subscription_status;

-- Step 5: Show real-time subscription status
SELECT 
    'Real-time Status' as test_type,
    user_id,
    email,
    current_plan,
    documents_uploaded,
    analyses_performed,
    text_extractions
FROM user_subscription_status
LIMIT 5;

