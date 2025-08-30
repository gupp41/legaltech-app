-- TEST_TEXT_EXTRACTION.sql
-- This script will test if text extractions are being saved to the database correctly

-- Step 1: Check if the text_extractions table exists and has data
SELECT '=== TEXT_EXTRACTIONS TABLE STATUS ===' as info;
SELECT 
  'Table exists' as check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'text_extractions' AND table_schema = 'public'
  ) THEN '✅ YES' ELSE '❌ NO' END as result
UNION ALL
SELECT 
  'Total extractions' as check_item,
  COUNT(*)::text as result
FROM text_extractions;

-- Step 2: Check text extractions for your user
SELECT '=== TEXT EXTRACTIONS FOR YOUR USER ===' as info;
SELECT 
  id,
  document_id,
  word_count,
  extraction_method,
  created_at,
  LEFT(extracted_text, 100) || '...' as text_preview
FROM text_extractions 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY created_at DESC;

-- Step 3: Check if the extractions are linked to existing documents
SELECT '=== EXTRACTION-DOCUMENT LINKAGE ===' as info;
SELECT 
  te.id as extraction_id,
  te.document_id,
  d.filename,
  te.word_count,
  te.created_at as extraction_time,
  d.created_at as document_time
FROM text_extractions te
LEFT JOIN documents d ON te.document_id = d.id
WHERE te.user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY te.created_at DESC;

-- Step 4: Check for any orphaned extractions (extractions without documents)
SELECT '=== ORPHANED EXTRACTIONS ===' as info;
SELECT 
  te.id,
  te.document_id,
  te.word_count,
  te.created_at
FROM text_extractions te
LEFT JOIN documents d ON te.document_id = d.id
WHERE te.user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
AND d.id IS NULL;

-- Step 5: Check the most recent extraction
SELECT '=== MOST RECENT EXTRACTION ===' as info;
SELECT 
  te.id,
  te.document_id,
  d.filename,
  te.word_count,
  te.extraction_method,
  te.created_at,
  CASE 
    WHEN LENGTH(te.extracted_text) > 200 
    THEN LEFT(te.extracted_text, 200) || '...' 
    ELSE te.extracted_text 
  END as text_preview
FROM text_extractions te
LEFT JOIN documents d ON te.document_id = d.id
WHERE te.user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY te.created_at DESC
LIMIT 1;

-- Step 6: Check if there are any recent extractions (last hour)
SELECT '=== RECENT EXTRACTIONS (LAST HOUR) ===' as info;
SELECT 
  COUNT(*) as recent_extractions_count
FROM text_extractions 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
AND created_at >= NOW() - INTERVAL '1 hour';

-- Step 7: Summary
SELECT '=== SUMMARY ===' as info;
SELECT 
  'Total extractions' as metric,
  COUNT(*) as value
FROM text_extractions 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
UNION ALL
SELECT 
  'Extractions today' as metric,
  COUNT(*) as value
FROM text_extractions 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
AND DATE(created_at) = CURRENT_DATE
UNION ALL
SELECT 
  'Extractions this week' as metric,
  COUNT(*) as value
FROM text_extractions 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
AND created_at >= CURRENT_DATE - INTERVAL '7 days';
