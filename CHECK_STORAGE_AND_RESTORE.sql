-- CHECK_STORAGE_AND_RESTORE.sql
-- This script will help us understand what happened and how to fix it

-- 1. Check current database state
SELECT '=== CURRENT DATABASE STATE ===' as info;
SELECT 'Documents table:' as table_name, COUNT(*) as record_count FROM documents
UNION ALL
SELECT 'Analyses table:' as table_name, COUNT(*) as record_count FROM analyses
UNION ALL
SELECT 'Usage tracking:' as table_name, COUNT(*) as record_count FROM usage_tracking;

-- 2. Check what documents exist for your user
SELECT '=== DOCUMENTS FOR YOUR USER ===' as info;
SELECT id, filename, storage_path, created_at, file_size 
FROM documents 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- 3. Check usage tracking for your user
SELECT '=== USAGE TRACKING FOR YOUR USER ===' as info;
SELECT * FROM usage_tracking 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- 4. Check if there are any orphaned records from other users
SELECT '=== ORPHANED RECORDS FROM OTHER USERS ===' as info;
SELECT user_id, COUNT(*) as document_count 
FROM documents 
GROUP BY user_id 
HAVING COUNT(*) > 0;

-- 5. Check if the documents table has any data at all
SELECT '=== TOTAL DOCUMENTS IN DATABASE ===' as info;
SELECT COUNT(*) as total_documents FROM documents;

-- 6. Check if there are any recent deletions (this might show in logs)
SELECT '=== CHECKING FOR RECENT ACTIVITY ===' as info;
SELECT 'This will help us understand what happened during the sync' as note;

-- The issue is likely that the sync function incorrectly identified all documents as orphaned
-- because it was comparing storage URLs with file paths incorrectly.
-- 
-- NEXT STEPS:
-- 1. Check your Supabase Storage bucket to see if files are still there
-- 2. If files exist, we'll restore the database records
-- 3. Fix the sync function to prevent this from happening again
