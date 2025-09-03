-- =====================================================
-- Add Missing Foreign Key Relationships
-- =====================================================
-- This script adds the missing foreign key relationships
-- that are needed for the team collaboration system to work properly.

-- Add foreign key from team_members.user_id to profiles.id
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key from team_members.invited_by to profiles.id
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key from team_invitations.invited_by to profiles.id
ALTER TABLE public.team_invitations 
ADD CONSTRAINT team_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key from team_document_shares.shared_by to profiles.id
ALTER TABLE public.team_document_shares 
ADD CONSTRAINT team_document_shares_shared_by_fkey 
FOREIGN KEY (shared_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key from teams.created_by to profiles.id
ALTER TABLE public.teams 
ADD CONSTRAINT teams_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key from profiles.current_team_id to teams.id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_current_team_id_fkey 
FOREIGN KEY (current_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add foreign key from profiles.default_team_id to teams.id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_default_team_id_fkey 
FOREIGN KEY (default_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add foreign key from documents.team_id to teams.id
ALTER TABLE public.documents 
ADD CONSTRAINT documents_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add foreign key from analyses.team_id to teams.id
ALTER TABLE public.analyses 
ADD CONSTRAINT analyses_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add foreign key from text_extractions.team_id to teams.id
ALTER TABLE public.text_extractions 
ADD CONSTRAINT text_extractions_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Missing foreign key relationships added successfully!';
  RAISE NOTICE 'Added foreign keys for:';
  RAISE NOTICE '  - team_members.user_id -> profiles.id';
  RAISE NOTICE '  - team_members.invited_by -> profiles.id';
  RAISE NOTICE '  - team_invitations.invited_by -> profiles.id';
  RAISE NOTICE '  - team_document_shares.shared_by -> profiles.id';
  RAISE NOTICE '  - teams.created_by -> profiles.id';
  RAISE NOTICE '  - profiles.current_team_id -> teams.id';
  RAISE NOTICE '  - profiles.default_team_id -> teams.id';
  RAISE NOTICE '  - documents.team_id -> teams.id';
  RAISE NOTICE '  - analyses.team_id -> teams.id';
  RAISE NOTICE '  - text_extractions.team_id -> teams.id';
  RAISE NOTICE 'Team collaboration system should now work properly!';
END $$;
