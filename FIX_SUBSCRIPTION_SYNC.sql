-- 🔧 FIX SUBSCRIPTION SYNC ISSUES
-- This script fixes the subscription sync problems

-- 1. First, let's migrate existing Plus users from profiles to subscriptions
INSERT INTO public.subscriptions (user_id, plan_type, status, start_date, current_period_start, current_period_end)
SELECT 
    id as user_id,
    current_plan as plan_type,
    'active' as status,
    plan_start_date as start_date,
    plan_start_date as current_period_start,
    plan_end_date as current_period_end
FROM public.profiles 
WHERE current_plan IN ('plus', 'max')
AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = profiles.id AND status = 'active'
);

-- 2. Ensure the trigger function exists
CREATE OR REPLACE FUNCTION sync_profile_with_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table when subscription changes
    UPDATE public.profiles 
    SET 
        current_plan = NEW.plan_type,
        plan_start_date = NEW.current_period_start,
        plan_end_date = NEW.current_period_end,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_sync_profile_subscription ON public.subscriptions;
CREATE TRIGGER trigger_sync_profile_subscription
    AFTER INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_with_subscription();

-- 4. Ensure the user_subscriptions view exists
CREATE OR REPLACE VIEW user_subscriptions AS
SELECT 
    s.id,
    s.user_id,
    s.plan_type,
    s.status,
    s.stripe_subscription_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    pd.name as plan_name,
    pd.description as plan_description,
    pd.price_monthly,
    pd.price_yearly,
    pd.features as plan_features,
    pd.limits as plan_limits,
    s.created_at,
    s.updated_at
FROM public.subscriptions s
LEFT JOIN public.plan_details pd ON s.plan_type = pd.plan_type
WHERE s.status = 'active';

-- 5. Test the trigger by updating a subscription
-- This should automatically update the profiles table
UPDATE public.subscriptions 
SET plan_type = 'plus', 
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month'
WHERE user_id = 'your-user-id-here';

-- 6. Verify the sync worked
SELECT 
    p.id,
    p.email,
    p.current_plan as profile_plan,
    s.plan_type as subscription_plan,
    s.status
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status = 'active'
WHERE p.current_plan IN ('plus', 'max');
