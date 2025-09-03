# 🗄️ Database Schema - Team Collaboration System

## 📋 Current Schema Analysis

### ✅ **Existing Tables (Good Foundation)**
- `profiles` - User profiles with company information
- `documents` - Document storage and metadata
- `analyses` - AI analysis results
- `subscriptions` - User subscription management
- `usage_tracking` - Individual user usage tracking
- `text_extractions` - Document text extraction results
- `plan_details` - Subscription plan definitions

### ⚠️ **Schema Conflicts & Issues**

1. **Duplicate Tables**: Both `document_shares` and `shared_documents` exist with similar purposes
2. **Missing Team Tables**: No team-related tables for collaboration
3. **Individual Focus**: Current schema is designed for individual users, not teams
4. **Sharing Limitations**: Current sharing is email-based, not team-based

---

## 🆕 **Required New Tables for Team Collaboration**

### 1. **teams** Table
```sql
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
```

### 2. **team_members** Table
```sql
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
```

### 3. **team_invitations** Table
```sql
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
```

### 4. **team_document_shares** Table (Replaces existing sharing)
```sql
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
```

### 5. **team_usage_tracking** Table
```sql
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
```

---

## 🔄 **Schema Modifications Required**

### 1. **Update documents table** - Add team context
```sql
ALTER TABLE public.documents 
ADD COLUMN team_id uuid REFERENCES public.teams(id),
ADD COLUMN is_team_document boolean DEFAULT false;
```

### 2. **Update analyses table** - Add team context
```sql
ALTER TABLE public.analyses 
ADD COLUMN team_id uuid REFERENCES public.teams(id),
ADD COLUMN is_team_analysis boolean DEFAULT false;
```

### 3. **Update text_extractions table** - Add team context
```sql
ALTER TABLE public.text_extractions 
ADD COLUMN team_id uuid REFERENCES public.teams(id),
ADD COLUMN is_team_extraction boolean DEFAULT false;
```

### 4. **Update profiles table** - Add team context
```sql
ALTER TABLE public.profiles 
ADD COLUMN current_team_id uuid REFERENCES public.teams(id),
ADD COLUMN default_team_id uuid REFERENCES public.teams(id);
```

---

## 🗑️ **Tables to Remove/Consolidate**

### Remove Duplicate Sharing Tables
- `document_shares` - Replace with `team_document_shares`
- `shared_documents` - Replace with `team_document_shares`

**Migration Strategy:**
1. Migrate existing shares to team-based sharing
2. Create default "personal team" for each user
3. Remove old sharing tables after migration

---

## 🔒 **Row Level Security (RLS) Policies**

### Teams Table
```sql
-- Users can only see teams they're members of
CREATE POLICY "Users can view teams they belong to" ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only team creators can update team settings
CREATE POLICY "Team creators can update teams" ON public.teams
  FOR UPDATE USING (created_by = auth.uid());

-- Only team creators can delete teams
CREATE POLICY "Team creators can delete teams" ON public.teams
  FOR DELETE USING (created_by = auth.uid());
```

### Team Members Table
```sql
-- Users can see team members of teams they belong to
CREATE POLICY "Users can view team members" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Team admins can manage team members
CREATE POLICY "Team admins can manage members" ON public.team_members
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );
```

### Team Invitations Table
```sql
-- Team admins can create invitations
CREATE POLICY "Team admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Invited users can see their invitations
CREATE POLICY "Users can view their invitations" ON public.team_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
```

### Team Document Shares Table
```sql
-- Team members can see shared documents
CREATE POLICY "Team members can view shared documents" ON public.team_document_shares
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Document owners can share with teams
CREATE POLICY "Document owners can share with teams" ON public.team_document_shares
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );
```

---

## 📊 **Database Functions & Triggers**

### 1. **Team Usage Aggregation Function**
```sql
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
```

### 2. **Auto-create Personal Team Function**
```sql
CREATE OR REPLACE FUNCTION create_personal_team()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.teams (name, created_by, settings)
  VALUES (
    COALESCE(NEW.full_name, NEW.email) || '''s Personal Team',
    NEW.id,
    '{"is_personal": true}'::jsonb
  );
  
  INSERT INTO public.team_members (team_id, user_id, role, invited_by, status, joined_at)
  SELECT id, NEW.id, 'admin', NEW.id, 'active', now()
  FROM public.teams 
  WHERE created_by = NEW.id AND settings->>'is_personal' = 'true';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_personal_team_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_personal_team();
```

### 3. **Team Member Management Functions**
```sql
-- Add team member function
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
```

---

## 📋 **Migration Strategy**

### Phase 1: Add New Tables
1. Create `teams` table
2. Create `team_members` table
3. Create `team_invitations` table
4. Create `team_document_shares` table
5. Create `team_usage_tracking` table

### Phase 2: Modify Existing Tables
1. Add team context columns to existing tables
2. Update RLS policies
3. Create database functions and triggers

### Phase 3: Data Migration
1. Create personal teams for existing users
2. Migrate existing document shares
3. Set up team usage tracking

### Phase 4: Cleanup
1. Remove old sharing tables
2. Update application code
3. Test and validate

---

## 🎯 **Implementation Checklist**

### ✅ **Database Schema**
- [ ] Create teams table
- [ ] Create team_members table
- [ ] Create team_invitations table
- [ ] Create team_document_shares table
- [ ] Create team_usage_tracking table
- [ ] Add team context to existing tables
- [ ] Implement RLS policies
- [ ] Create database functions
- [ ] Create triggers
- [ ] Test schema changes

### ✅ **Data Migration**
- [ ] Create personal teams for existing users
- [ ] Migrate existing document shares
- [ ] Set up team usage tracking
- [ ] Validate data integrity
- [ ] Remove old tables

---

**Status**: 🟡 Ready for Implementation  
**Next Action**: Begin Phase 1 - Create new team tables  
**Estimated Time**: 1-2 days for schema implementation  
**Last Updated**: January 2025
