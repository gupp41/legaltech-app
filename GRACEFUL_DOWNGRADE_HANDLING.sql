-- 🔧 GRACEFUL DOWNGRADE HANDLING
-- This script handles users who exceed free plan limits when downgraded

-- 1. Create a function to handle graceful downgrades
CREATE OR REPLACE FUNCTION handle_graceful_downgrade(user_id_param UUID)
RETURNS void AS $$
DECLARE
    current_usage RECORD;
    free_limits RECORD;
    excess_documents INTEGER;
    excess_analyses INTEGER;
    excess_extractions INTEGER;
    excess_storage BIGINT;
BEGIN
    -- Get current month's usage
    SELECT 
        documents_uploaded,
        analyses_performed,
        text_extractions,
        storage_used_bytes
    INTO current_usage
    FROM public.usage_tracking 
    WHERE user_id = user_id_param 
    AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
    
    -- Get free plan limits
    SELECT limits INTO free_limits
    FROM public.plan_details 
    WHERE plan_type = 'free';
    
    -- Calculate excess usage
    excess_documents := GREATEST(0, (current_usage.documents_uploaded - (free_limits.limits->>'documents')::INTEGER));
    excess_analyses := GREATEST(0, (current_usage.analyses_performed - (free_limits.limits->>'analyses')::INTEGER));
    excess_extractions := GREATEST(0, (current_usage.text_extractions - (free_limits.limits->>'extractions')::INTEGER));
    excess_storage := GREATEST(0, (current_usage.storage_used_bytes - (free_limits.limits->>'storage')::BIGINT));
    
    -- If there's excess usage, we have several options:
    -- Option 1: Allow access but show warnings
    -- Option 2: Restrict new uploads/analyses
    -- Option 3: Archive excess content
    
    -- For now, we'll implement Option 1: Allow access but track excess
    -- This gives users time to either upgrade again or clean up their content
    
    -- Log the excess usage for monitoring
    INSERT INTO public.downgrade_excess_log (
        user_id,
        excess_documents,
        excess_analyses,
        excess_extractions,
        excess_storage_bytes,
        downgrade_date
    ) VALUES (
        user_id_param,
        excess_documents,
        excess_analyses,
        excess_extractions,
        excess_storage,
        NOW()
    );
    
    -- Update usage tracking to reflect the excess
    UPDATE public.usage_tracking 
    SET 
        excess_documents = excess_documents,
        excess_analyses = excess_analyses,
        excess_extractions = excess_extractions,
        excess_storage_bytes = excess_storage,
        updated_at = NOW()
    WHERE user_id = user_id_param 
    AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
    
END;
$$ LANGUAGE plpgsql;

-- 2. Create a table to track excess usage after downgrades
CREATE TABLE IF NOT EXISTS public.downgrade_excess_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    excess_documents INTEGER NOT NULL DEFAULT 0,
    excess_analyses INTEGER NOT NULL DEFAULT 0,
    excess_extractions INTEGER NOT NULL DEFAULT 0,
    excess_storage_bytes BIGINT NOT NULL DEFAULT 0,
    downgrade_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_date TIMESTAMP WITH TIME ZONE,
    resolution_type TEXT CHECK (resolution_type IN ('upgraded', 'cleaned_up', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add excess tracking columns to usage_tracking table
ALTER TABLE public.usage_tracking 
ADD COLUMN IF NOT EXISTS excess_documents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excess_analyses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excess_extractions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excess_storage_bytes BIGINT DEFAULT 0;

-- 4. Update the subscription sync trigger to handle graceful downgrades
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
            -- Subscription cancelled or unpaid - handle graceful downgrade
            UPDATE public.profiles 
            SET 
                current_plan = 'free',
                plan_start_date = NOW(),
                plan_end_date = NULL,
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
            -- Handle graceful downgrade for excess usage
            PERFORM handle_graceful_downgrade(NEW.user_id);
            
        WHEN 'incomplete', 'incomplete_expired' THEN
            -- Incomplete subscription - handle graceful downgrade
            UPDATE public.profiles 
            SET 
                current_plan = 'free',
                plan_start_date = NOW(),
                plan_end_date = NULL,
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
            -- Handle graceful downgrade for excess usage
            PERFORM handle_graceful_downgrade(NEW.user_id);
            
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

-- 5. Create a function to check if user has excess usage
CREATE OR REPLACE FUNCTION has_excess_usage(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage RECORD;
    free_limits RECORD;
BEGIN
    -- Get current month's usage
    SELECT 
        documents_uploaded,
        analyses_performed,
        text_extractions,
        storage_used_bytes
    INTO current_usage
    FROM public.usage_tracking 
    WHERE user_id = user_id_param 
    AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
    
    -- Get free plan limits
    SELECT limits INTO free_limits
    FROM public.plan_details 
    WHERE plan_type = 'free';
    
    -- Check if any usage exceeds free limits
    RETURN (
        current_usage.documents_uploaded > (free_limits.limits->>'documents')::INTEGER OR
        current_usage.analyses_performed > (free_limits.limits->>'analyses')::INTEGER OR
        current_usage.text_extractions > (free_limits.limits->>'extractions')::INTEGER OR
        current_usage.storage_used_bytes > (free_limits.limits->>'storage')::BIGINT
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Create a view for users with excess usage
CREATE OR REPLACE VIEW users_with_excess_usage AS
SELECT 
    u.id,
    u.email,
    p.current_plan,
    ut.documents_uploaded,
    ut.analyses_performed,
    ut.text_extractions,
    ut.storage_used_bytes,
    ut.excess_documents,
    ut.excess_analyses,
    ut.excess_extractions,
    ut.excess_storage_bytes,
    pd.limits as free_limits,
    del.downgrade_date,
    del.resolved_date,
    del.resolution_type
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.usage_tracking ut ON u.id = ut.user_id 
    AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
LEFT JOIN public.plan_details pd ON pd.plan_type = 'free'
LEFT JOIN public.downgrade_excess_log del ON u.id = del.user_id 
    AND del.resolved_date IS NULL
WHERE p.current_plan = 'free'
AND has_excess_usage(u.id);

-- 7. Add RLS policies for the new table
ALTER TABLE public.downgrade_excess_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own excess usage" ON public.downgrade_excess_log
    FOR SELECT USING (auth.uid() = user_id);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_downgrade_excess_log_user_id ON public.downgrade_excess_log(user_id);
CREATE INDEX IF NOT EXISTS idx_downgrade_excess_log_resolved ON public.downgrade_excess_log(resolved_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_excess ON public.usage_tracking(user_id, excess_documents, excess_analyses);
