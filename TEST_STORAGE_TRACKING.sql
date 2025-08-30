-- 🧪 TEST STORAGE TRACKING
-- This script tests if storage tracking is working properly

-- Step 1: Check current storage usage
SELECT 
    'Current Storage Usage' as test_type,
    p.email,
    ut.month_year,
    ut.storage_used_bytes,
    ROUND(ut.storage_used_bytes / 1024.0 / 1024.0, 2) as storage_mb
FROM public.profiles p
JOIN public.usage_tracking ut ON p.id = ut.user_id
WHERE ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY ut.storage_used_bytes DESC;

-- Step 2: Manually test storage increment (replace 'your-email@example.com' with your actual email)
-- This simulates what happens when you upload a file
UPDATE public.usage_tracking 
SET 
    storage_used_bytes = storage_used_bytes + 1024 * 1024, -- Add 1MB
    updated_at = NOW()
WHERE user_id = (
    SELECT id FROM public.profiles 
    WHERE email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
)
AND month_year = TO_CHAR(NOW(), 'YYYY-MM');

-- Step 3: Check if the update worked
SELECT 
    'After Storage Update' as test_type,
    p.email,
    ut.month_year,
    ut.storage_used_bytes,
    ROUND(ut.storage_used_bytes / 1024.0 / 1024.0, 2) as storage_mb
FROM public.profiles p
JOIN public.usage_tracking ut ON p.id = ut.user_id
WHERE ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY ut.storage_used_bytes DESC;

-- Step 4: Check document sizes in the documents table
SELECT 
    'Document Sizes' as test_type,
    d.filename,
    d.file_size,
    ROUND(d.file_size / 1024.0 / 1024.0, 2) as size_mb,
    d.created_at
FROM public.documents d
JOIN public.profiles p ON d.user_id = p.id
WHERE p.email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
ORDER BY d.created_at DESC;

-- Step 5: Calculate total storage from documents
SELECT 
    'Total Document Storage' as test_type,
    p.email,
    COUNT(d.id) as document_count,
    SUM(d.file_size) as total_storage_bytes,
    ROUND(SUM(d.file_size) / 1024.0 / 1024.0, 2) as total_storage_mb
FROM public.profiles p
JOIN public.documents d ON p.id = d.user_id
WHERE p.email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
GROUP BY p.id, p.email;

-- Step 6: Compare usage tracking vs actual document storage
SELECT 
    'Storage Comparison' as test_type,
    p.email,
    ut.storage_used_bytes as tracked_storage,
    COALESCE(SUM(d.file_size), 0) as actual_document_storage,
    ROUND(ut.storage_used_bytes / 1024.0 / 1024.0, 2) as tracked_mb,
    ROUND(COALESCE(SUM(d.file_size), 0) / 1024.0 / 1024.0, 2) as actual_mb,
    CASE 
        WHEN ut.storage_used_bytes = COALESCE(SUM(d.file_size), 0) THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as status
FROM public.profiles p
JOIN public.usage_tracking ut ON p.id = ut.user_id
LEFT JOIN public.documents d ON p.id = d.user_id
WHERE p.email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
GROUP BY p.id, p.email, ut.storage_used_bytes;

