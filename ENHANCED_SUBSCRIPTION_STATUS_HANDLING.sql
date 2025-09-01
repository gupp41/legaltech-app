-- 🔧 ENHANCED SUBSCRIPTION STATUS HANDLING
-- This script improves the subscription status handling and database trigger

-- 1. Update the database trigger to handle all subscription statuses properly
CREATE OR REPLACE FUNCTION sync_profile_with_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table when subscription changes
    -- Handle different subscription statuses appropriately
    CASE NEW.status
        WHEN 'active' THEN
            -- Active subscription - use the plan from subscription
            UPDATE public.profiles 
            SET 
                current_plan = NEW.plan_type,
                plan_start_date = NEW.current_period_start,
                plan_end_date = NEW.current_period_end,
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
        WHEN 'past_due' THEN
            -- Payment failed but still in grace period - keep current plan
            -- Don't change the plan, just update the dates
            UPDATE public.profiles 
            SET 
                plan_start_date = NEW.current_period_start,
                plan_end_date = NEW.current_period_end,
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
        WHEN 'canceled', 'cancelled', 'unpaid' THEN
            -- Subscription cancelled or unpaid - downgrade to free
            UPDATE public.profiles 
            SET 
                current_plan = 'free',
                plan_start_date = NOW(),
                plan_end_date = NULL,
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
        WHEN 'incomplete', 'incomplete_expired' THEN
            -- Incomplete subscription - downgrade to free
            UPDATE public.profiles 
            SET 
                current_plan = 'free',
                plan_start_date = NOW(),
                plan_end_date = NULL,
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
        ELSE
            -- For any other status, keep current plan but update dates
            UPDATE public.profiles 
            SET 
                plan_start_date = NEW.current_period_start,
                plan_end_date = NEW.current_period_end,
                updated_at = NOW()
            WHERE id = NEW.user_id;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add additional Stripe subscription statuses to the subscriptions table
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN (
    'active', 
    'canceled', 
    'cancelled', 
    'incomplete', 
    'incomplete_expired', 
    'past_due', 
    'paused', 
    'trialing', 
    'unpaid'
));

-- 3. Create a function to check and update expired subscriptions
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void AS $$
BEGIN
    -- Find subscriptions that are past due and should be downgraded
    UPDATE public.subscriptions 
    SET 
        status = 'cancelled',
        updated_at = NOW()
    WHERE status = 'past_due' 
    AND current_period_end < NOW() - INTERVAL '7 days'; -- 7-day grace period
    
    -- The trigger will automatically handle the profile updates
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to validate subscription status
CREATE OR REPLACE FUNCTION validate_subscription_status(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    subscription_status TEXT;
    profile_plan TEXT;
BEGIN
    -- Get current subscription status
    SELECT status INTO subscription_status
    FROM public.subscriptions 
    WHERE user_id = user_id_param 
    AND status IN ('active', 'past_due', 'trialing')
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    -- Get current profile plan
    SELECT current_plan INTO profile_plan
    FROM public.profiles 
    WHERE id = user_id_param;
    
    -- Return the effective plan based on subscription status
    CASE 
        WHEN subscription_status = 'active' OR subscription_status = 'trialing' THEN
            RETURN profile_plan;
        WHEN subscription_status = 'past_due' THEN
            RETURN profile_plan; -- Keep current plan during grace period
        ELSE
            RETURN 'free'; -- Default to free for any other status
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a view for active subscriptions with status validation
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
    s.*,
    pd.name as plan_name,
    pd.description as plan_description,
    pd.features as plan_features,
    pd.limits as plan_limits,
    CASE 
        WHEN s.status = 'active' OR s.status = 'trialing' THEN s.plan_type
        WHEN s.status = 'past_due' THEN s.plan_type -- Keep plan during grace period
        ELSE 'free'
    END as effective_plan
FROM public.subscriptions s
LEFT JOIN public.plan_details pd ON s.plan_type = pd.plan_type
WHERE s.status IN ('active', 'past_due', 'trialing')
AND (s.current_period_end IS NULL OR s.current_period_end > NOW());

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_period ON public.subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
