-- DIAGNOSE_STORAGE_SYNC.sql
-- This script will diagnose the storage vs database synchronization issue

-- Step 1: Check current database state
SELECT '=== CURRENT DATABASE STATE ===' as info;
SELECT 
  'Documents table' as table_name, 
  COUNT(*) as record_count 
FROM documents
UNION ALL
SELECT 
  'Analyses table' as table_name, 
  COUNT(*) as record_count 
FROM analyses
UNION ALL
SELECT 
  'Usage tracking' as table_name, 
  COUNT(*) as record_count 
FROM usage_tracking;

-- Step 2: Check documents for your user
SELECT '=== DOCUMENTS FOR YOUR USER ===' as info;
SELECT 
  id, 
  filename, 
  storage_path, 
  created_at, 
  file_size,
  user_id
FROM documents 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY created_at DESC;

-- Step 3: Check usage tracking for your user
SELECT '=== USAGE TRACKING FOR YOUR USER ===' as info;
SELECT 
  user_id,
  month_year,
  documents_uploaded,
  storage_used_bytes,
  analyses_performed,
  text_extractions,
  created_at,
  updated_at
FROM usage_tracking 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY month_year DESC;

-- Step 4: Check if there are any orphaned records from other users
SELECT '=== ORPHANED RECORDS FROM OTHER USERS ===' as info;
SELECT 
  user_id, 
  COUNT(*) as document_count 
FROM documents 
GROUP BY user_id 
HAVING COUNT(*) > 0
ORDER BY document_count DESC;

-- Step 5: Check the total documents in database
SELECT '=== TOTAL DOCUMENTS IN DATABASE ===' as info;
SELECT COUNT(*) as total_documents FROM documents;

-- Step 6: Check for any recent activity or issues
SELECT '=== CHECKING FOR RECENT ACTIVITY ===' as info;
SELECT 
  'Documents created today' as metric,
  COUNT(*) as value
FROM documents 
WHERE DATE(created_at) = CURRENT_DATE
UNION ALL
SELECT 
  'Documents created this week' as metric,
  COUNT(*) as value
FROM documents 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
  'Documents created this month' as metric,
  COUNT(*) as value
FROM documents 
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- Step 7: Check for any storage path inconsistencies
SELECT '=== STORAGE PATH ANALYSIS ===' as info;
SELECT 
  filename,
  storage_path,
  CASE 
    WHEN storage_path LIKE '%/storage/v1/object/public/documents/%' THEN 'Valid Supabase URL'
    WHEN storage_path LIKE '%/storage/v1/object/public/%' THEN 'Other bucket URL'
    WHEN storage_path IS NULL THEN 'No storage path'
    ELSE 'Unknown format'
  END as url_type,
  CASE 
    WHEN storage_path LIKE '%/storage/v1/object/public/documents/%' 
    THEN SPLIT_PART(storage_path, '/documents/', 2)
    ELSE 'N/A'
  END as extracted_path
FROM documents 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY created_at DESC;
