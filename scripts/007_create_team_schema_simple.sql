-- =====================================================
-- Team Collaboration System - Simplified Schema
-- =====================================================
-- This script creates the basic tables without complex RLS policies
-- to avoid recursion issues. RLS policies can be added later.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE BASIC TEAM TABLES
-- =====================================================

-- Teams table - Core team information
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb,
  billing_email text,
  subscription_id uuid,
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);

-- Team members table - Team membership and roles
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'viewer'::text])),
  invited_by uuid NOT NULL,
  invited_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text])),
  permissions jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT team_members_unique UNIQUE (team_id, user_id)
);

-- Team invitations table - Invitation management
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'viewer'::text])),
  invited_by uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT team_invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT team_invitations_unique UNIQUE (team_id, email)
);

-- Team document shares table - Team-based document sharing
CREATE TABLE IF NOT EXISTS public.team_document_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  team_id uuid NOT NULL,
  shared_by uuid NOT NULL,
  access_level text DEFAULT 'view'::text CHECK (access_level = ANY (ARRAY['view'::text, 'comment'::text, 'edit'::text])),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_document_shares_pkey PRIMARY KEY (id),
  CONSTRAINT team_document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE,
  CONSTRAINT team_document_shares_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT team_document_shares_unique UNIQUE (document_id, team_id)
);

-- Team usage tracking table - Team-level usage aggregation
CREATE TABLE IF NOT EXISTS public.team_usage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  month_year text NOT NULL,
  documents_uploaded integer NOT NULL DEFAULT 0,
  analyses_performed integer NOT NULL DEFAULT 0,
  storage_used_bytes bigint NOT NULL DEFAULT 0,
  text_extractions integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_usage_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT team_usage_tracking_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT team_usage_tracking_unique UNIQUE (team_id, month_year)
);

-- =====================================================
-- 2. ADD TEAM CONTEXT TO EXISTING TABLES
-- =====================================================

-- Add team context to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS team_id uuid,
ADD COLUMN IF NOT EXISTS is_team_document boolean DEFAULT false;

-- Add team context to analyses table
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS team_id uuid,
ADD COLUMN IF NOT EXISTS is_team_analysis boolean DEFAULT false;

-- Add team context to text_extractions table
ALTER TABLE public.text_extractions 
ADD COLUMN IF NOT EXISTS team_id uuid,
ADD COLUMN IF NOT EXISTS is_team_extraction boolean DEFAULT false;

-- Add team context to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_team_id uuid,
ADD COLUMN IF NOT EXISTS default_team_id uuid;

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Teams table indexes
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_subscription_id ON public.teams(subscription_id);

-- Team members table indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- Team invitations table indexes
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON public.team_invitations(expires_at);

-- Team document shares table indexes
CREATE INDEX IF NOT EXISTS idx_team_document_shares_document_id ON public.team_document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_team_document_shares_team_id ON public.team_document_shares(team_id);
CREATE INDEX IF NOT EXISTS idx_team_document_shares_shared_by ON public.team_document_shares(shared_by);

-- Team usage tracking table indexes
CREATE INDEX IF NOT EXISTS idx_team_usage_tracking_team_id ON public.team_usage_tracking(team_id);
CREATE INDEX IF NOT EXISTS idx_team_usage_tracking_month_year ON public.team_usage_tracking(month_year);

-- =====================================================
-- 4. CREATE BASIC FUNCTIONS
-- =====================================================

-- Function to create a personal team for new users
CREATE OR REPLACE FUNCTION create_personal_team()
RETURNS trigger AS $$
DECLARE
  team_id uuid;
BEGIN
  -- Create personal team
  INSERT INTO public.teams (name, created_by, settings)
  VALUES (
    COALESCE(NEW.full_name, NEW.email) || '''s Personal Team',
    NEW.id,
    '{"is_personal": true}'::jsonb
  )
  RETURNING id INTO team_id;
  
  -- Add user as admin of their personal team
  INSERT INTO public.team_members (team_id, user_id, role, invited_by, status, joined_at)
  VALUES (team_id, NEW.id, 'admin', NEW.id, 'active', now());
  
  -- Set as default team
  UPDATE public.profiles 
  SET default_team_id = team_id, current_team_id = team_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Trigger to create personal team for new users
DROP TRIGGER IF EXISTS create_personal_team_trigger ON public.profiles;
CREATE TRIGGER create_personal_team_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_personal_team();

-- =====================================================
-- 6. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for team member details with user information
CREATE OR REPLACE VIEW public.team_member_details AS
SELECT 
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.status,
  tm.joined_at,
  p.full_name,
  p.email,
  p.company_name
FROM public.team_members tm
JOIN public.profiles p ON tm.user_id = p.id;

-- View for team document shares with document details
CREATE OR REPLACE VIEW public.team_document_share_details AS
SELECT 
  tds.id,
  tds.document_id,
  tds.team_id,
  tds.access_level,
  tds.expires_at,
  d.filename,
  d.file_type,
  d.file_size,
  p.full_name as shared_by_name
FROM public.team_document_shares tds
JOIN public.documents d ON tds.document_id = d.id
JOIN public.profiles p ON tds.shared_by = p.id;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_document_shares TO authenticated;
GRANT SELECT ON public.team_usage_tracking TO authenticated;

-- Grant permissions to views
GRANT SELECT ON public.team_member_details TO authenticated;
GRANT SELECT ON public.team_document_share_details TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Team Collaboration System basic schema created successfully!';
  RAISE NOTICE 'Tables created: teams, team_members, team_invitations, team_document_shares, team_usage_tracking';
  RAISE NOTICE 'Functions created: create_personal_team, generate_invitation_token';
  RAISE NOTICE 'Triggers created: create_personal_team_trigger';
  RAISE NOTICE 'Views created: team_member_details, team_document_share_details';
  RAISE NOTICE 'RLS policies will be added in a separate script to avoid recursion issues';
  RAISE NOTICE 'Ready for API testing!';
END $$;
