-- 🚀 CONSOLIDATED SUBSCRIPTION SCHEMA
-- This script consolidates subscription data into a single source of truth

-- 1. ENHANCE subscriptions table with complete Stripe data
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. CREATE plan_details table for pricing and features
CREATE TABLE IF NOT EXISTS public.plan_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type TEXT NOT NULL UNIQUE CHECK (plan_type IN ('free', 'plus', 'max')),
    name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    features JSONB NOT NULL DEFAULT '[]',
    limits JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INSERT plan details
INSERT INTO public.plan_details (plan_type, name, description, price_monthly, price_yearly, features, limits) VALUES
('free', 'Free', 'Starter plan for individual users', 0, 0, 
 '["Basic document management", "Standard AI analysis quality", "Email support (48-hour response)", "Basic export options", "User dashboard", "Document history"]',
 '{"documents": 5, "analyses": 20, "storage": 104857600, "extractions": 5}'),
 
('plus', 'Plus', 'Professional plan for small law firms', 29, 290,
 '["Everything in Free, plus:", "Advanced document organization", "Priority AI analysis", "Enhanced export options", "Email support (24-hour response)", "Basic analytics dashboard", "Team collaboration (up to 3 users)", "Document templates", "Advanced search and filtering"]',
 '{"documents": 50, "analyses": 200, "storage": 2147483648, "extractions": 50}'),
 
('max', 'Max', 'Enterprise plan for law firms and corporate legal departments', 99, 990,
 '["Everything in Plus, plus:", "Unlimited everything", "Priority processing", "Advanced analytics and reporting", "Team management (up to 10 users)", "API access for integrations", "Custom branding options", "Phone + email support (4-hour response)", "Bulk operations", "Advanced security features", "Compliance reporting", "Custom workflows", "White-label options"]',
 '{"documents": -1, "analyses": -1, "storage": 53687091200, "extractions": -1}')
ON CONFLICT (plan_type) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    updated_at = NOW();

-- 4. CREATE function to sync profiles with subscriptions
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

-- 5. CREATE trigger to auto-sync profiles
DROP TRIGGER IF EXISTS trigger_sync_profile_subscription ON public.subscriptions;
CREATE TRIGGER trigger_sync_profile_subscription
    AFTER INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_with_subscription();

-- 6. CREATE view for easy subscription queries
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

-- 7. CREATE indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_plan_details_plan_type ON public.plan_details(plan_type);

-- 8. MIGRATE existing data (if any)
-- This will sync existing profiles data to subscriptions table
INSERT INTO public.subscriptions (user_id, plan_type, status, start_date, end_date)
SELECT 
    id as user_id,
    current_plan as plan_type,
    'active' as status,
    plan_start_date as start_date,
    plan_end_date as end_date
FROM public.profiles 
WHERE current_plan != 'free' 
AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = profiles.id AND status = 'active'
);

-- 9. ADD RLS policies
ALTER TABLE public.plan_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan details are viewable by everyone" ON public.plan_details
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);
