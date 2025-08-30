-- RESTORE_DOCUMENTS_FINAL.sql
-- This script will restore your 6 documents from storage back to the database

-- First, let's see what files exist in storage for your user
-- We'll need to manually recreate the database records since the sync function deleted them

-- Step 1: Create a temporary table to hold the file information
CREATE TEMP TABLE temp_storage_files (
  filename TEXT,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Insert the file information from your storage
INSERT INTO temp_storage_files (filename, file_path, file_size, file_type, created_at) VALUES
('1756524002519-V1 NDA - CondoAI Manager - signed.pdf', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756524002519-V1 NDA - CondoAI Manager - signed.pdf', 236728, 'application/pdf', '2025-08-30 00:00:00+00'),
('1756566902505-construction-contract.docx', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756566902505-construction-contract.docx', 41338, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-08-30 00:00:00+00'),
('1756569713787-V1 NDA - CondoAI Manager - signed.pdf', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756569713787-V1 NDA - CondoAI Manager - signed.pdf', 236728, 'application/pdf', '2025-08-30 00:00:00+00'),
('1756570000885-construction-contract.docx', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756570000885-construction-contract.docx', 41338, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-08-30 00:00:00+00'),
('1756574608486-V1 NDA - CondoAI Manager - signed.pdf', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756574608486-V1 NDA - CondoAI Manager - signed.pdf', 236728, 'application/pdf', '2025-08-30 00:00:00+00'),
('1756574742162-V1 NDA - CondoAI Manager - signed.pdf', 'db4e910a-2771-4fdc-b3a1-0aa85d414d79/1756574742162-V1 NDA - CondoAI Manager - signed.pdf', 236728, 'application/pdf', '2025-08-30 00:00:00+00');

-- Step 3: Restore the documents to the database
INSERT INTO documents (
  user_id,
  filename,
  original_filename,
  file_size,
  file_type,
  storage_path,
  upload_status,
  created_at
)
SELECT 
  'db4e910a-2771-4fdc-b3a1-0aa85d414d79' as user_id,
  filename,
  filename as original_filename,
  file_size,
  file_type,
  -- Construct the full storage URL
  'https://mkmeiitbdbhhpbkfyqir.supabase.co/storage/v1/object/public/documents/' || file_path as storage_path,
  'completed' as upload_status,
  created_at
FROM temp_storage_files;

-- Step 4: Verify the restoration
SELECT '=== RESTORATION RESULTS ===' as info;
SELECT 
  'Documents restored:' as metric,
  COUNT(*) as value
FROM documents 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Step 5: Show the restored documents
SELECT '=== RESTORED DOCUMENTS ===' as info;
SELECT 
  id,
  filename,
  file_size,
  file_type,
  storage_path,
  created_at
FROM documents 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79'
ORDER BY created_at;

-- Step 6: Update usage tracking to reflect the restored documents
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

-- Step 7: Show updated usage tracking
SELECT '=== UPDATED USAGE TRACKING ===' as info;
SELECT * FROM usage_tracking 
WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Clean up
DROP TABLE temp_storage_files;
