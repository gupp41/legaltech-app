-- FIX_STORAGE_SYNC.sql
-- This script will fix the storage synchronization issue

-- Step 1: First, let's see what files exist in storage for your user
-- We'll need to manually recreate the database records since the sync function deleted them

-- Create a temporary table to hold the file information from storage
CREATE TEMP TABLE temp_storage_files (
  filename TEXT,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Insert the file information from your storage (these are the 5 files that exist)
INSERT INTO temp_storage_files (filename, file_path, file_size, file_type, created_at) VALUES
('1756524002519-V1 NDA - CondoAI Manager - signed.pdf', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756524002519-V1 NDA - CondoAI Manager - signed.pdf', 236728, 'application/pdf', '2025-08-30 00:00:00+00'),
('1756566902505-construction-contract.docx', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756566902505-construction-contract.docx', 41338, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-08-30 00:00:00+00'),
('1756569713787-V1 NDA - CondoAI Manager - signed.pdf', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756569713787-V1 NDA - CondoAI Manager - signed.pdf', 236728, 'application/pdf', '2025-08-30 00:00:00+00'),
('1756570000885-construction-contract.docx', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756570000885-construction-contract.docx', 41338, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-08-30 00:00:00+00'),
('1756574608486-V1 NDA - CondoAI Manager - signed.pdf', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756574608486-V1 NDA - CondoAI Manager - signed.pdf', 236728, 'application/pdf', '2025-08-30 00:00:00+00');

-- Step 2: Check what documents currently exist in the database
SELECT '=== CURRENT DOCUMENTS IN DATABASE ===' as info;
SELECT COUNT(*) as current_document_count FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Step 3: Restore the missing documents to the database
INSERT INTO documents (
  user_id,
  filename,
  original_filename,
  file_size,
  file_type,
  storage_path,
  upload_status,
  created_at,
  updated_at
)
SELECT 
  'db4e910a-2771-4fdc-b3a1-0aa85d414d79' as user_id,
  filename,
  filename as original_filename,
  file_size,
  file_type,
  'https://mkmeiitbdbhhpbkfyqir.supabase.co/storage/v1/object/public/documents/' || file_path as storage_path,
  'completed' as upload_status,
  created_at,
  NOW() as updated_at
FROM temp_storage_files
WHERE NOT EXISTS (
  SELECT 1 FROM documents d 
  WHERE d.user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79' 
  AND d.filename = temp_storage_files.filename
);

-- Step 4: Verify the documents were restored
SELECT '=== DOCUMENTS AFTER RESTORATION ===' as info;
SELECT 
  id, 
  filename, 
  file_size,
  upload_status,
  created_at
FROM documents 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY created_at DESC;

-- Step 5: Fix the usage tracking to match the actual document count
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

-- Step 6: Verify the usage tracking was fixed
SELECT '=== USAGE TRACKING AFTER FIX ===' as info;
SELECT 
  user_id,
  month_year,
  documents_uploaded,
  storage_used_bytes,
  analyses_performed,
  text_extractions,
  updated_at
FROM usage_tracking 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY month_year DESC;

-- Step 7: Clean up temporary table
DROP TABLE temp_storage_files;

-- Step 8: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;
SELECT 
  'Database documents' as metric,
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

SELECT '✅ Storage sync issue should now be fixed!' as result;
