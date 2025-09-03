-- =====================================================
-- Temporarily Disable RLS for Testing
-- =====================================================
-- This script disables RLS policies temporarily to allow API testing
-- RLS can be re-enabled later with proper policies

-- Disable RLS on team tables temporarily
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_document_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_usage_tracking DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users for testing
GRANT ALL ON public.teams TO authenticated;
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_document_shares TO authenticated;
GRANT ALL ON public.team_usage_tracking TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'RLS temporarily disabled for testing';
  RAISE NOTICE 'Tables should now be accessible for API testing';
  RAISE NOTICE 'Remember to re-enable RLS with proper policies later';
END $$;
