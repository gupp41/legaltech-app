-- 🔧 SYNC EXISTING PLUS USER
-- This script specifically fixes your current situation

-- 1. Update your existing subscription record to match your profile
UPDATE public.subscriptions 
SET 
    plan_type = 'plus',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW()
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- 2. Verify the update worked
SELECT 
    p.id,
    p.email,
    p.current_plan as profile_plan,
    s.plan_type as subscription_plan,
    s.status,
    s.current_period_start,
    s.current_period_end
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status = 'active'
WHERE p.id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- 3. Test the trigger by making a small update to trigger the sync
UPDATE public.subscriptions 
SET updated_at = NOW()
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- 4. Check if the profiles table was updated by the trigger
SELECT 
    id,
    email,
    current_plan,
    plan_start_date,
    plan_end_date,
    updated_at
FROM public.profiles 
WHERE id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';
