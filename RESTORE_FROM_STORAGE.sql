    -- RESTORE_FROM_STORAGE.sql
    -- This script will restore your documents from storage

    -- First, let's see what's currently in the database
    SELECT '=== CURRENT STATE ===' as info;
    SELECT 'Documents count:' as metric, COUNT(*) as value FROM documents
    UNION ALL
    SELECT 'Analyses count:' as metric, COUNT(*) as value FROM analyses
    UNION ALL
    SELECT 'Usage tracking count:' as metric, COUNT(*) as value FROM usage_tracking;

    -- Check if there are any documents at all
    SELECT '=== DOCUMENTS TABLE STATUS ===' as info;
    SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'EMPTY - All documents were deleted'
        ELSE 'Has ' || COUNT(*) || ' documents'
    END as status
    FROM documents;

    -- Check if there are any analyses that might reference deleted documents
    SELECT '=== ORPHANED ANALYSES ===' as info;
    SELECT COUNT(*) as orphaned_analyses 
    FROM analyses a 
    LEFT JOIN documents d ON a.document_id = d.id 
    WHERE d.id IS NULL;

    -- Check usage tracking
    SELECT '=== USAGE TRACKING STATUS ===' as info;
    SELECT * FROM usage_tracking 
    WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

    -- IMPORTANT: Before running this script, please check your storage bucket manually:
    -- 1. Go to Supabase Dashboard → Storage → documents bucket
    -- 2. Look for files in folders like: db4e910a-2771-4fdc-b3a1-0aa85d414d79/
    -- 3. Note down the filenames you see
    -- 4. Tell me what files you find in storage

    -- Once you confirm what files exist in storage, I'll create the restore script
    -- to recreate the database records with the correct information.
