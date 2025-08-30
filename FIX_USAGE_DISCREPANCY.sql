-- FIX_USAGE_DISCREPANCY.sql
-- This script resets the usage_tracking table to match actual database counts

-- First, let's see what's currently in usage_tracking
SELECT 'Current usage_tracking data:' as info;
SELECT * FROM usage_tracking WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Let's see what's actually in the database tables
SELECT 'Actual documents count:' as info;
SELECT COUNT(*) as document_count FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

SELECT 'Actual analyses count:' as info;
SELECT COUNT(*) as analysis_count FROM analyses WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

SELECT 'Actual storage used:' as info;
SELECT COALESCE(SUM(file_size), 0) as total_storage_bytes FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Now let's reset the usage_tracking table with correct data
-- First, delete the current incorrect data
DELETE FROM usage_tracking WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Insert correct data based on actual database counts
INSERT INTO usage_tracking (
  user_id,
  month_year,
  documents_uploaded,
  analyses_performed,
  storage_used_bytes,
  text_extractions,
  created_at,
  updated_at
)
SELECT 
  'db4e910a-2771-4fdc-b3a1-0aa85d414d79' as user_id,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM') as month_year,
  COALESCE((SELECT COUNT(*) FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'), 0) as documents_uploaded,
  COALESCE((SELECT COUNT(*) FROM analyses WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'), 0) as analyses_performed,
  COALESCE((SELECT COALESCE(SUM(file_size), 0) FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'), 0) as storage_used_bytes,
  0 as text_extractions, -- Set to 0 since table doesn't exist
  NOW() as created_at,
  NOW() as updated_at;

-- Verify the fix
SELECT 'Updated usage_tracking data:' as info;
SELECT * FROM usage_tracking WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Also check the user_subscription_status view
SELECT 'User subscription status view:' as info;
SELECT * FROM user_subscription_status WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';
