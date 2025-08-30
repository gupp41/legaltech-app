-- 🚀 INITIALIZE USAGE DATA FOR EXISTING USERS
-- This script creates usage tracking records for existing users
-- Run this after COMPLETE_DATABASE_SETUP.sql

-- Get current month in YYYY-MM format
DO $$
DECLARE
    current_month TEXT;
    user_record RECORD;
BEGIN
    current_month := TO_CHAR(NOW(), 'YYYY-MM');
    
    RAISE NOTICE 'Initializing usage data for month: %', current_month;
    
    -- Loop through all existing users and create usage records if they don't exist
    FOR user_record IN 
        SELECT id FROM auth.users 
        WHERE id NOT IN (
            SELECT user_id FROM public.usage_tracking 
            WHERE month_year = current_month
        )
    LOOP
        -- Insert usage record for current month
        INSERT INTO public.usage_tracking (
            user_id, 
            month_year, 
            documents_uploaded, 
            analyses_performed, 
            storage_used_bytes, 
            text_extractions
        ) VALUES (
            user_record.id, 
            current_month, 
            0, 
            0, 
            0, 
            0
        );
        
        RAISE NOTICE 'Created usage record for user: %', user_record.id;
    END LOOP;
    
    RAISE NOTICE 'Usage data initialization complete!';
END $$;

-- Verify the data was created
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN month_year = TO_CHAR(NOW(), 'YYYY-MM') THEN 1 END) as current_month_users
FROM public.usage_tracking;

-- Show sample of current month usage data
SELECT 
    ut.user_id,
    p.email,
    ut.month_year,
    ut.documents_uploaded,
    ut.analyses_performed,
    ut.storage_used_bytes,
    ut.text_extractions
FROM public.usage_tracking ut
JOIN public.profiles p ON ut.user_id = p.id
WHERE ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
LIMIT 5;

