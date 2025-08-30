-- FIX_CURRENT_USAGE.sql
-- This script will fix the current usage tracking to match the actual document count

-- Check current state
SELECT '=== CURRENT STATE ===' as info;
SELECT 'Documents in database:' as metric, COUNT(*) as value FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
UNION ALL
SELECT 'Usage tracking documents:' as metric, documents_uploaded FROM usage_tracking WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Update usage tracking to match actual document count
UPDATE usage_tracking 
SET 
  documents_uploaded = (
    SELECT COUNT(*) 
    FROM documents 
    WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
  ),
  storage_used_bytes = (
    SELECT COALESCE(SUM(file_size), 0)
    FROM documents 
    WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
  ),
  updated_at = NOW()
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Verify the fix
SELECT '=== AFTER FIX ===' as info;
SELECT 'Documents in database:' as metric, COUNT(*) as value FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
UNION ALL
SELECT 'Usage tracking documents:' as metric, documents_uploaded FROM usage_tracking WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';
