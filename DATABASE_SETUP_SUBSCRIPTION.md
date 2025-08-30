# 🚀 Quick Subscription System Setup

## ⚠️ **Current Issue**
The UsageDisplay component is showing "Failed to load usage data" because the subscription database schema hasn't been created yet.

## 🔧 **Quick Fix (5 minutes)**

### **Step 1: Access Supabase Dashboard**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**

### **Step 2: Run the Subscription Schema**
Copy and paste this entire script:

```sql
-- 🚀 Subscription System Database Schema
-- This script creates the necessary tables for subscription management and usage tracking

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'plus', 'max')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active subscription per user
    UNIQUE(user_id, status) WHERE status = 'active'
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    documents_uploaded INTEGER NOT NULL DEFAULT 0,
    analyses_performed INTEGER NOT NULL DEFAULT 0,
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    text_extractions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per month
    UNIQUE(user_id, month_year)
);

-- Add subscription fields to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'free' CHECK (current_plan IN ('free', 'plus', 'max'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_end_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_month_year ON usage_tracking(month_year);

-- Create RLS policies for subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for usage_tracking table
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON usage_tracking
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at 
    BEFORE UPDATE ON usage_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default free subscriptions for existing users
INSERT INTO subscriptions (user_id, plan_type, status, start_date)
SELECT id, 'free', 'active', NOW()
FROM users
WHERE id NOT IN (SELECT user_id FROM subscriptions WHERE status = 'active');

-- Update existing users to have free plan
UPDATE users 
SET current_plan = 'free', 
    plan_start_date = NOW()
WHERE current_plan IS NULL;

-- Create function to get current month usage
CREATE OR REPLACE FUNCTION get_current_month_usage(user_uuid UUID)
RETURNS TABLE (
    documents_uploaded INTEGER,
    analyses_performed INTEGER,
    storage_used_bytes BIGINT,
    text_extractions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ut.documents_uploaded, 0),
        COALESCE(ut.analyses_performed, 0),
        COALESCE(ut.storage_used_bytes, 0),
        COALESCE(ut.text_extractions, 0)
    FROM usage_tracking ut
    WHERE ut.user_id = user_uuid 
    AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM');
    
    -- If no record exists, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get plan limits
CREATE OR REPLACE FUNCTION get_plan_limits(plan TEXT)
RETURNS TABLE (
    max_documents INTEGER,
    max_analyses INTEGER,
    max_storage_bytes BIGINT,
    max_extractions INTEGER
) AS $$
BEGIN
    CASE plan
        WHEN 'free' THEN
            RETURN QUERY SELECT 5, 20, 100*1024*1024, 5; -- 100MB
        WHEN 'plus' THEN
            RETURN QUERY SELECT 50, 200, 2*1024*1024*1024, 50; -- 2GB
        WHEN 'max' THEN
            RETURN QUERY SELECT 2147483647, 2147483647, 50*1024*1024*1024, 2147483647; -- 50GB, unlimited counts
        ELSE
            RETURN QUERY SELECT 5, 20, 100*1024*1024, 5; -- Default to free
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON usage_tracking TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create view for user subscription status
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
    u.id as user_id,
    u.email,
    u.current_plan,
    u.plan_start_date,
    u.plan_end_date,
    s.status as subscription_status,
    s.stripe_subscription_id,
    TO_CHAR(NOW(), 'YYYY-MM') as current_month,
    COALESCE(ut.documents_uploaded, 0) as documents_uploaded,
    COALESCE(ut.analyses_performed, 0) as analyses_performed,
    COALESCE(ut.storage_used_bytes, 0) as storage_used_bytes,
    COALESCE(ut.text_extractions, 0) as text_extractions
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN usage_tracking ut ON u.id = ut.user_id AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM');

-- Grant access to the view
GRANT SELECT ON user_subscription_status TO authenticated;
```

### **Step 3: Click "Run"**
Click the "Run" button in the SQL Editor.

### **Step 4: Verify Tables Created**
Go to **Table Editor** → You should see:
- `subscriptions` ✅
- `usage_tracking` ✅
- `user_subscription_status` (view) ✅

## 🎯 **What This Fixes**

✅ **UsageDisplay Error** - Component will now load properly  
✅ **Real Usage Tracking** - Actual usage data will be displayed  
✅ **Subscription Management** - Full subscription system enabled  
✅ **Usage Enforcement** - Plan limits will be enforced  

## 🧪 **Test the Fix**

1. **Refresh your dashboard** - The UsageDisplay should now work
2. **Upload a document** - Usage should increment
3. **Run an analysis** - Analysis count should update
4. **Extract text** - Extraction count should update

## 🚨 **If You Still See Errors**

Check the browser console for specific error messages. The most common issues are:
- **Permission denied** → RLS policies not working
- **Table not found** → Schema script didn't run completely
- **View not found** → `user_subscription_status` view missing

---

*This setup takes less than 5 minutes and will enable the full subscription system!* 🚀
