-- =====================================================
-- Team Collaboration System Database Schema
-- =====================================================
-- This script creates all tables, functions, and policies
-- needed for the team collaboration system.
-- 
-- Phase 1: Database Schema & Foundation
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE TEAM COLLABORATION TABLES
-- =====================================================

-- Teams table - Core team information
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb,
  billing_email text,
  subscription_id uuid,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT teams_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id)
);

-- Team members table - Team membership and roles
CREATE TABLE public.team_members (
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
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id),
  CONSTRAINT team_members_unique UNIQUE (team_id, user_id)
);

-- Team invitations table - Invitation management
CREATE TABLE public.team_invitations (
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
  CONSTRAINT team_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id),
  CONSTRAINT team_invitations_unique UNIQUE (team_id, email)
);

-- Team document shares table - Team-based document sharing
CREATE TABLE public.team_document_shares (
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
  CONSTRAINT team_document_shares_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES auth.users(id),
  CONSTRAINT team_document_shares_unique UNIQUE (document_id, team_id)
);

-- Team usage tracking table - Team-level usage aggregation
CREATE TABLE public.team_usage_tracking (
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
-- 2. MODIFY EXISTING TABLES FOR TEAM CONTEXT
-- =====================================================

-- Add team context to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS is_team_document boolean DEFAULT false;

-- Add team context to analyses table
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS is_team_analysis boolean DEFAULT false;

-- Add team context to text_extractions table
ALTER TABLE public.text_extractions 
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS is_team_extraction boolean DEFAULT false;

-- Add team context to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_team_id uuid REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS default_team_id uuid REFERENCES public.teams(id);

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
-- 4. CREATE DATABASE FUNCTIONS
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

-- Function to add a team member
CREATE OR REPLACE FUNCTION add_team_member(
  team_uuid uuid,
  user_uuid uuid,
  member_role text DEFAULT 'member',
  inviter_uuid uuid DEFAULT auth.uid()
)
RETURNS uuid AS $$
DECLARE
  member_id uuid;
BEGIN
  -- Check if inviter is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = team_uuid AND user_id = inviter_uuid 
    AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only team admins can add members';
  END IF;
  
  -- Add member
  INSERT INTO public.team_members (team_id, user_id, role, invited_by, status, joined_at)
  VALUES (team_uuid, user_uuid, member_role, inviter_uuid, 'active', now())
  RETURNING id INTO member_id;
  
  RETURN member_id;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate team usage
CREATE OR REPLACE FUNCTION aggregate_team_usage(team_uuid uuid, month_year_param text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.team_usage_tracking (
    team_id, month_year, documents_uploaded, analyses_performed, 
    storage_used_bytes, text_extractions
  )
  SELECT 
    team_uuid,
    month_year_param,
    COALESCE(SUM(documents_uploaded), 0),
    COALESCE(SUM(analyses_performed), 0),
    COALESCE(SUM(storage_used_bytes), 0),
    COALESCE(SUM(text_extractions), 0)
  FROM public.usage_tracking ut
  JOIN public.team_members tm ON ut.user_id = tm.user_id
  WHERE tm.team_id = team_uuid 
    AND tm.status = 'active'
    AND ut.month_year = month_year_param
  ON CONFLICT (team_id, month_year) 
  DO UPDATE SET
    documents_uploaded = EXCLUDED.documents_uploaded,
    analyses_performed = EXCLUDED.analyses_performed,
    storage_used_bytes = EXCLUDED.storage_used_bytes,
    text_extractions = EXCLUDED.text_extractions,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token text)
RETURNS uuid AS $$
DECLARE
  invitation_record public.team_invitations%ROWTYPE;
  member_id uuid;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.team_invitations
  WHERE token = invitation_token
    AND expires_at > now()
    AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = invitation_record.email
  ) THEN
    RAISE EXCEPTION 'User account not found';
  END IF;
  
  -- Add user to team
  INSERT INTO public.team_members (team_id, user_id, role, invited_by, status, joined_at)
  SELECT 
    invitation_record.team_id,
    u.id,
    invitation_record.role,
    invitation_record.invited_by,
    'active',
    now()
  FROM auth.users u
  WHERE u.email = invitation_record.email
  RETURNING id INTO member_id;
  
  -- Mark invitation as accepted
  UPDATE public.team_invitations
  SET accepted_at = now()
  WHERE id = invitation_record.id;
  
  RETURN member_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Trigger to create personal team for new users
CREATE TRIGGER create_personal_team_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_personal_team();

-- Trigger to update team usage when individual usage changes
CREATE OR REPLACE FUNCTION update_team_usage_on_change()
RETURNS trigger AS $$
DECLARE
  team_record RECORD;
  current_month_year text;
BEGIN
  current_month_year := to_char(now(), 'YYYY-MM');
  
  -- Get all teams the user belongs to
  FOR team_record IN 
    SELECT team_id FROM public.team_members 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) 
    AND status = 'active'
  LOOP
    PERFORM aggregate_team_usage(team_record.team_id, current_month_year);
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to usage_tracking table
CREATE TRIGGER update_team_usage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_team_usage_on_change();

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all team tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_usage_tracking ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES
-- =====================================================

-- Teams table policies
CREATE POLICY "Users can view teams they belong to" ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Team creators can update teams" ON public.teams
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Team creators can delete teams" ON public.teams
  FOR DELETE USING (created_by = auth.uid());

-- Team members table policies
CREATE POLICY "Users can view team members" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Team admins can manage members" ON public.team_members
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Team invitations table policies
CREATE POLICY "Team admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

CREATE POLICY "Users can view their invitations" ON public.team_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Team admins can manage invitations" ON public.team_invitations
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Team document shares table policies
CREATE POLICY "Team members can view shared documents" ON public.team_document_shares
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Document owners can share with teams" ON public.team_document_shares
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Document owners can manage sharing" ON public.team_document_shares
  FOR ALL USING (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

-- Team usage tracking table policies
CREATE POLICY "Team members can view team usage" ON public.team_usage_tracking
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =====================================================
-- 8. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for team member details with user information
CREATE VIEW public.team_member_details AS
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
CREATE VIEW public.team_document_share_details AS
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
-- 9. GRANT PERMISSIONS
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
  RAISE NOTICE 'Team Collaboration System database schema created successfully!';
  RAISE NOTICE 'Tables created: teams, team_members, team_invitations, team_document_shares, team_usage_tracking';
  RAISE NOTICE 'Functions created: create_personal_team, add_team_member, aggregate_team_usage, generate_invitation_token, accept_team_invitation';
  RAISE NOTICE 'Triggers created: create_personal_team_trigger, update_team_usage_trigger';
  RAISE NOTICE 'RLS policies enabled for all team tables';
  RAISE NOTICE 'Views created: team_member_details, team_document_share_details';
  RAISE NOTICE 'Ready for Phase 2: Backend API Development';
END $$;
