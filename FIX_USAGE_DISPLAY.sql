-- 🚀 FIX USAGE DISPLAY ISSUES
-- This script fixes the usage display by ensuring proper data exists
-- Run this after COMPLETE_DATABASE_SETUP.sql

-- Step 1: Ensure all existing users have profiles with proper plan data
UPDATE public.profiles 
SET current_plan = COALESCE(current_plan, 'free'),
    plan_start_date = COALESCE(plan_start_date, NOW())
WHERE current_plan IS NULL OR plan_start_date IS NULL;

-- Step 2: Ensure all users have active subscriptions
INSERT INTO public.subscriptions (user_id, plan_type, status, start_date)
SELECT p.id, p.current_plan, 'active', p.plan_start_date
FROM public.profiles p
WHERE p.id NOT IN (
    SELECT user_id FROM public.subscriptions WHERE status = 'active'
);

-- Step 3: Create usage tracking records for all users for current month
INSERT INTO public.usage_tracking (
    user_id, 
    month_year, 
    documents_uploaded, 
    analyses_performed, 
    storage_used_bytes, 
    text_extractions
)
SELECT 
    p.id,
    TO_CHAR(NOW(), 'YYYY-MM'),
    0,
    0,
    0,
    0
FROM public.profiles p
WHERE p.id NOT IN (
    SELECT user_id FROM public.usage_tracking 
    WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM')
);

-- Step 4: Update the view to handle missing usage data better
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
LEFT JOIN public.usage_tracking ut ON p.id = ut.user_id AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
WHERE p.id IS NOT NULL;

-- Step 5: Verify the data
SELECT 
    'Profiles' as table_name,
    COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
    'Subscriptions' as table_name,
    COUNT(*) as count
FROM public.subscriptions
WHERE status = 'active'
UNION ALL
SELECT 
    'Usage Tracking (Current Month)' as table_name,
    COUNT(*) as count
FROM public.usage_tracking
WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM')
UNION ALL
SELECT 
    'View Results' as table_name,
    COUNT(*) as count
FROM user_subscription_status;

-- Step 6: Show sample data from the view
SELECT 
    user_id,
    email,
    current_plan,
    documents_uploaded,
    analyses_performed,
    storage_used_bytes,
    text_extractions
FROM user_subscription_status
LIMIT 5;

