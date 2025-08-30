-- CHECK_DATABASE_STATUS.sql
-- Check what's currently in the database and storage

-- Check documents table
SELECT 'Current documents in database:' as info;
SELECT id, filename, storage_path, created_at FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Check usage_tracking table
SELECT 'Current usage tracking:' as info;
SELECT * FROM usage_tracking WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';

-- Check if there are any documents at all
SELECT 'Total documents count:' as info;
SELECT COUNT(*) as total_documents FROM documents;

-- Check if there are any documents for your user
SELECT 'Documents for your user:' as info;
SELECT COUNT(*) as user_documents FROM documents WHERE user_id = 'db4e910a-2771-4fdc-b3a1-0aa85d414d79';
