-- 🚀 SYNC EXISTING USAGE DATA
-- This script syncs your existing documents and analyses with the usage tracking system
-- Run this to fix the "0 usage" issue

-- Step 1: Calculate actual usage from existing data for current month
WITH current_month_usage AS (
  SELECT 
    d.user_id,
    COUNT(d.id) as actual_documents,
    COALESCE(SUM(d.file_size), 0) as actual_storage_bytes,
    COUNT(a.id) as actual_analyses,
    0 as actual_extractions -- Text extractions are not stored separately
  FROM public.documents d
  LEFT JOIN public.analyses a ON d.id = a.document_id
  WHERE d.created_at >= DATE_TRUNC('month', NOW()) -- Current month
  GROUP BY d.user_id
)
-- Step 2: Update usage_tracking with real data
UPDATE public.usage_tracking ut
SET 
  documents_uploaded = cmu.actual_documents,
  storage_used_bytes = cmu.actual_storage_bytes,
  analyses_performed = cmu.actual_analyses,
  text_extractions = cmu.actual_extractions,
  updated_at = NOW()
FROM current_month_usage cmu
WHERE ut.user_id = cmu.user_id 
AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM');

-- Step 3: Also update for previous months if needed (last 3 months)
WITH monthly_usage AS (
  SELECT 
    d.user_id,
    TO_CHAR(d.created_at, 'YYYY-MM') as month_year,
    COUNT(d.id) as actual_documents,
    COALESCE(SUM(d.file_size), 0) as actual_storage_bytes,
    COUNT(a.id) as actual_analyses,
    0 as actual_extractions
  FROM public.documents d
  LEFT JOIN public.analyses a ON d.id = a.document_id
  WHERE d.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '3 months')
  GROUP BY d.user_id, TO_CHAR(d.created_at, 'YYYY-MM')
)
INSERT INTO public.usage_tracking (
  user_id, 
  month_year, 
  documents_uploaded, 
  analyses_performed, 
  storage_used_bytes, 
  text_extractions
)
SELECT 
  mu.user_id,
  mu.month_year,
  mu.actual_documents,
  mu.actual_analyses,
  mu.actual_storage_bytes,
  mu.actual_extractions
FROM monthly_usage mu
WHERE NOT EXISTS (
  SELECT 1 FROM public.usage_tracking ut 
  WHERE ut.user_id = mu.user_id AND ut.month_year = mu.month_year
)
ON CONFLICT (user_id, month_year) 
DO UPDATE SET
  documents_uploaded = EXCLUDED.documents_uploaded,
  analyses_performed = EXCLUDED.analyses_performed,
  storage_used_bytes = EXCLUDED.storage_used_bytes,
  text_extractions = EXCLUDED.text_extractions,
  updated_at = NOW();

-- Step 4: Verify the sync worked
SELECT 
  'Current Month Usage' as period,
  COUNT(*) as users_with_data,
  SUM(documents_uploaded) as total_documents,
  SUM(analyses_performed) as total_analyses,
  SUM(storage_used_bytes) as total_storage_bytes
FROM public.usage_tracking 
WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM')

UNION ALL

SELECT 
  'All Time Usage' as period,
  COUNT(DISTINCT user_id) as users_with_data,
  SUM(documents_uploaded) as total_documents,
  SUM(analyses_performed) as total_analyses,
  SUM(storage_used_bytes) as total_storage_bytes
FROM public.usage_tracking;

-- Step 5: Show your personal usage data
SELECT 
  p.email,
  p.current_plan,
  ut.month_year,
  ut.documents_uploaded,
  ut.analyses_performed,
  ut.storage_used_bytes,
  ut.text_extractions
FROM public.profiles p
JOIN public.usage_tracking ut ON p.id = ut.user_id
WHERE ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY ut.documents_uploaded DESC;

-- Step 6: Test the view
SELECT 
  'View Test' as test_type,
  COUNT(*) as records_returned,
  SUM(documents_uploaded) as total_docs_in_view,
  SUM(analyses_performed) as total_analyses_in_view
FROM user_subscription_status;

