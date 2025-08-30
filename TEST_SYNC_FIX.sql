    -- TEST_SYNC_FIX.sql
    -- This script will test if the storage sync fix is working correctly

    -- Step 1: Check the current state after running the fix
    SELECT '=== CURRENT STATE AFTER FIX ===' as info;

    -- Check documents count
    SELECT 
    'Documents in database' as metric,
    COUNT(*) as value
    FROM documents 
    WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
    UNION ALL
    SELECT 
    'Usage tracking documents' as metric,
    documents_uploaded as value
    FROM usage_tracking 
    WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
    AND month_year = TO_CHAR(NOW(), 'YYYY-MM');

    -- Step 2: Check if all 5 files are now properly represented
SELECT '=== ALL DOCUMENTS SHOULD BE VISIBLE ===' as info;
SELECT 
  id,
  filename,
  file_size,
  upload_status,
  created_at,
  CASE 
    WHEN storage_path LIKE '%/storage/v1/object/public/documents/%' THEN 'Valid Supabase URL'
    ELSE 'Invalid URL format'
  END as url_status
FROM documents 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY created_at DESC;

    -- Step 3: Check usage tracking is accurate
    SELECT '=== USAGE TRACKING ACCURACY ===' as info;
    SELECT 
    month_year,
    documents_uploaded,
    storage_used_bytes,
    analyses_performed,
    text_extractions,
    updated_at
    FROM usage_tracking 
    WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
    ORDER BY month_year DESC;

    -- Step 4: Verify storage paths are consistent
    SELECT '=== STORAGE PATH CONSISTENCY ===' as info;
    SELECT 
    filename,
    SPLIT_PART(storage_path, '/documents/', 2) as extracted_path,
    CASE 
        WHEN SPLIT_PART(storage_path, '/documents/', 2) LIKE 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/%' THEN '✅ Valid user path'
        ELSE '❌ Invalid user path'
    END as path_validation
    FROM documents 
    WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
    ORDER BY filename;

    -- Step 5: Test the sync function logic (simulation)
    SELECT '=== SYNC FUNCTION LOGIC TEST ===' as info;
    WITH storage_simulation AS (
    SELECT 
        'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756524002519-V1 NDA - CondoAI Manager - signed.pdf' as storage_path,
        '1756524002519-V1 NDA - CondoAI Manager - signed.pdf' as filename
    UNION ALL
    SELECT 
        'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756566902505-construction-contract.docx',
        '1756566902505-construction-contract.docx'
    UNION ALL
    SELECT 
        'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756569713787-V1 NDA - CondoAI Manager - signed.pdf',
        '1756569713787-V1 NDA - CondoAI Manager - signed.pdf'
    UNION ALL
    SELECT 
        'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756570000885-construction-contract.docx',
        '1756570000885-construction-contract.docx'
    UNION ALL
    SELECT 
        'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756574608486-V1 NDA - CondoAI Manager - signed.pdf',
        '1756574608486-V1 NDA - CondoAI Manager - signed.pdf'
    )
    SELECT 
    'Storage files count' as metric,
    COUNT(*) as value
    FROM storage_simulation
    UNION ALL
    SELECT 
    'Database files count' as metric,
    COUNT(*) as value
    FROM documents 
    WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

    -- Step 6: Final verification
    SELECT '=== FINAL VERIFICATION ===' as info;
    SELECT 
    CASE 
        WHEN (
        SELECT COUNT(*) FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
        ) = 5 
        AND (
        SELECT documents_uploaded FROM usage_tracking 
        WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79' 
        AND month_year = TO_CHAR(NOW(), 'YYYY-MM')
        ) = 5
        THEN '✅ SYNC ISSUE FIXED - All 5 files are now visible and usage tracking is accurate'
        ELSE '❌ SYNC ISSUE NOT FIXED - There are still discrepancies'
    END as verification_result;
