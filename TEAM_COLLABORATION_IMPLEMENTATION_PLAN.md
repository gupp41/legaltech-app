# 🚀 Team Collaboration System Implementation Plan

## 📋 Overview
This document outlines the step-by-step implementation of the Team Collaboration System for the LegalTech App. This feature will enable multiple users to work together on documents, share access, and manage team resources.

**RICE Score:** 101.25 (Highest Priority)  
**Estimated Timeline:** 2-3 weeks  
**Complexity:** Medium (Good foundation exists)

---

## 🎯 **PHASE 1: DATABASE SCHEMA & FOUNDATION**

### 🔐 **1.1 Database Schema Updates**
- [x] Create `teams` table
  - [x] id (UUID, primary key)
  - [x] name (string, team name)
  - [x] description (text, optional team description)
  - [x] created_by (UUID, foreign key to users)
  - [x] created_at (timestamp)
  - [x] updated_at (timestamp)
  - [x] settings (JSONB, team-specific settings)
  - [x] billing_email (string, for team billing)
  - [x] subscription_id (UUID, foreign key to subscriptions)

- [x] Create `team_members` table
  - [x] id (UUID, primary key)
  - [x] team_id (UUID, foreign key to teams)
  - [x] user_id (UUID, foreign key to users)
  - [x] role (enum: 'admin', 'member', 'viewer')
  - [x] invited_by (UUID, foreign key to users)
  - [x] invited_at (timestamp)
  - [x] joined_at (timestamp, nullable)
  - [x] status (enum: 'pending', 'active', 'suspended')
  - [x] permissions (JSONB, role-specific permissions)

- [x] Create `team_invitations` table
  - [x] id (UUID, primary key)
  - [x] team_id (UUID, foreign key to teams)
  - [x] email (string, invited user email)
  - [x] role (enum: 'admin', 'member', 'viewer')
  - [x] invited_by (UUID, foreign key to users)
  - [x] token (string, unique invitation token)
  - [x] expires_at (timestamp)
  - [x] accepted_at (timestamp, nullable)
  - [x] created_at (timestamp)

- [x] Create `team_document_shares` table
  - [x] id (UUID, primary key)
  - [x] document_id (UUID, foreign key to documents)
  - [x] team_id (UUID, foreign key to teams)
  - [x] shared_by (UUID, foreign key to users)
  - [x] access_level (enum: 'view', 'comment', 'edit')
  - [x] expires_at (timestamp, nullable)
  - [x] created_at (timestamp)
  - [x] updated_at (timestamp)

### 🔒 **1.2 Row Level Security (RLS) Policies**
- [x] Teams table RLS policies
  - [x] Users can only see teams they're members of
  - [x] Team admins can update team settings
  - [x] Only team creators can delete teams

- [x] Team members table RLS policies
  - [x] Users can only see team members of teams they belong to
  - [x] Team admins can manage team members
  - [x] Users can see their own membership status

- [x] Team invitations table RLS policies
  - [x] Team admins can create invitations
  - [x] Invited users can see their pending invitations
  - [x] Team admins can revoke invitations

- [x] Team document shares table RLS policies
  - [x] Team members can see shared documents
  - [x] Document owners can share/unshare documents
  - [x] Access level enforcement

### 📊 **1.3 Database Functions & Triggers**
- [x] Create team usage aggregation function
  - [x] Aggregate usage across all team members
  - [x] Calculate team-level limits and warnings
  - [x] Update team subscription status

- [x] Create team member management functions
  - [x] Add team member function
  - [x] Remove team member function
  - [x] Update team member role function
  - [x] Transfer team ownership function

- [x] Create invitation management functions
  - [x] Generate invitation token function
  - [x] Validate invitation token function
  - [x] Accept invitation function
  - [x] Cleanup expired invitations function

- [x] Create personal team auto-creation trigger
  - [x] Auto-create personal team for new users
  - [x] Set user as admin of personal team
  - [x] Set as default team

---

## 🎨 **PHASE 2: BACKEND API DEVELOPMENT** ✅ COMPLETED

### 🔌 **2.1 Team Management API Routes** ✅ COMPLETED
- [x] `POST /api/teams` - Create new team
  - [x] Validate user permissions
  - [x] Create team record
  - [x] Add creator as admin member
  - [x] Return team details

- [x] `GET /api/teams` - List user's teams
  - [x] Get teams where user is member
  - [x] Include member count and role
  - [x] Return team summary data

- [x] `GET /api/teams/[id]` - Get team details
  - [x] Validate team membership
  - [x] Return team info and member list
  - [x] Include usage statistics

- [x] `PUT /api/teams/[id]` - Update team settings
  - [x] Validate admin permissions
  - [x] Update team information
  - [x] Return updated team data

- [x] `DELETE /api/teams/[id]` - Delete team
  - [x] Validate ownership permissions
  - [x] Handle team member cleanup
  - [x] Handle document sharing cleanup

### 👥 **2.2 Team Member Management API Routes** ✅ COMPLETED
- [x] `GET /api/teams/[id]/members` - List team members
  - [x] Validate team membership
  - [x] Return member list with roles
  - [x] Include invitation status

- [x] `POST /api/teams/[id]/members` - Add team member
  - [x] Validate admin permissions
  - [x] Create team member record
  - [x] Send invitation email
  - [x] Return member details

- [x] `PUT /api/teams/[id]/members/[memberId]` - Update member role
  - [x] Validate admin permissions
  - [x] Update member role
  - [x] Log role change
  - [x] Return updated member data

- [x] `DELETE /api/teams/[id]/members/[memberId]` - Remove team member
  - [x] Validate admin permissions
  - [x] Remove member from team
  - [x] Handle document access cleanup
  - [x] Send notification email

### 📧 **2.3 Team Invitation API Routes** ✅ COMPLETED
- [x] `POST /api/teams/[id]/invitations` - Send team invitation
  - [x] Validate admin permissions
  - [x] Generate invitation token
  - [x] Send invitation email
  - [x] Return invitation details

- [x] `GET /api/teams/invitations/[token]` - Get invitation details
  - [x] Validate invitation token
  - [x] Check expiration
  - [x] Return invitation information

- [x] `POST /api/teams/invitations/[token]` - Accept invitation
  - [x] Validate invitation token
  - [x] Create team member record
  - [x] Update invitation status
  - [x] Send welcome email

- [x] `DELETE /api/teams/invitations/[token]` - Revoke invitation
  - [x] Validate admin permissions
  - [x] Mark invitation as revoked
  - [x] Send revocation email

- [x] `GET /api/teams/[id]/invitations` - List pending invitations
  - [x] Validate admin permissions
  - [x] Return pending invitations list
  - [x] Include expiration status

### 📄 **2.4 Document Sharing API Routes** ✅ COMPLETED
- [x] `POST /api/teams/[id]/documents` - Share document with team
  - [x] Validate document ownership
  - [x] Validate team membership
  - [x] Create shared document record
  - [x] Return sharing details

- [x] `GET /api/teams/[id]/documents` - List team shared documents
  - [x] Validate team membership
  - [x] Return shared documents list
  - [x] Include access levels

- [x] `PUT /api/teams/[id]/documents/[shareId]` - Update document access
  - [x] Validate document ownership
  - [x] Update access level
  - [x] Log access change
  - [x] Return updated access info

- [x] `DELETE /api/teams/[id]/documents/[shareId]` - Unshare document
  - [x] Validate document ownership
  - [x] Remove shared document record
  - [x] Send notification to team
  - [x] Return confirmation

### 📊 **Phase 2 Summary**
- **Total API Routes**: 15 endpoints implemented
- **Authentication**: All routes require proper authentication
- **Authorization**: Role-based access control (admin, member, viewer)
- **Error Handling**: Comprehensive error responses and validation
- **Security**: Team membership validation and document ownership checks
- **Testing**: All endpoints tested and returning correct responses

**Key Features Implemented:**
- Complete team management (CRUD operations)
- Team member management with role-based permissions
- Invitation system with token-based security
- Document sharing with access level controls
- Proper error handling and validation throughout

---

## 🎨 **PHASE 3: FRONTEND COMPONENTS**

### 🏠 **3.1 Team Dashboard Components**
- [ ] `TeamSelector` component
  - [ ] Dropdown to switch between teams
  - [ ] Show current team name and role
  - [ ] "Create New Team" option
  - [ ] Team switching functionality

- [ ] `TeamOverview` component
  - [ ] Team information display
  - [ ] Member count and list
  - [ ] Usage statistics
  - [ ] Quick actions (invite, settings)

- [ ] `TeamSettings` component
  - [ ] Team name and description editing
  - [ ] Billing information management
  - [ ] Team deletion (admin only)
  - [ ] Settings save functionality

### 👥 **3.2 Team Member Management Components**
- [ ] `TeamMembersList` component
  - [ ] Display team members with roles
  - [ ] Show invitation status
  - [ ] Member management actions
  - [ ] Role change functionality

- [ ] `InviteTeamMember` component
  - [ ] Email input form
  - [ ] Role selection dropdown
  - [ ] Invitation message
  - [ ] Send invitation functionality

- [ ] `TeamMemberCard` component
  - [ ] Member information display
  - [ ] Role badge
  - [ ] Action buttons (edit, remove)
  - [ ] Status indicators

### 📧 **3.3 Invitation Management Components**
- [ ] `InvitationList` component
  - [ ] Display pending invitations
  - [ ] Show invitation details
  - [ ] Accept/decline actions
  - [ ] Invitation expiration warnings

- [ ] `InvitationCard` component
  - [ ] Team information display
  - [ ] Inviter details
  - [ ] Role information
  - [ ] Accept/decline buttons

- [ ] `InvitationEmail` component
  - [ ] Email template for invitations
  - [ ] Team branding
  - [ ] Clear call-to-action
  - [ ] Invitation link

### 📄 **3.4 Document Sharing Components**
- [ ] `DocumentSharing` component
  - [ ] Share document with team
  - [ ] Access level selection
  - [ ] Team member selection
  - [ ] Sharing confirmation

- [ ] `SharedDocumentsList` component
  - [ ] List team shared documents
  - [ ] Access level indicators
  - [ ] Document actions
  - [ ] Sharing management

- [ ] `DocumentAccessControl` component
  - [ ] Manage document permissions
  - [ ] Update access levels
  - [ ] Remove sharing
  - [ ] Access history

---

## 🎨 **PHASE 4: USER INTERFACE INTEGRATION**

### 🏠 **4.1 Dashboard Integration**
- [ ] Add team selector to main dashboard
  - [ ] Replace user context with team context
  - [ ] Show team-specific documents
  - [ ] Display team usage statistics
  - [ ] Team switching functionality

- [ ] Update document list for team context
  - [ ] Show shared documents
  - [ ] Display sharing indicators
  - [ ] Team-specific filtering
  - [ ] Access level indicators

- [ ] Add team management to settings
  - [ ] Team settings page
  - [ ] Member management interface
  - [ ] Invitation management
  - [ ] Team billing information

### 📱 **4.2 Navigation Updates**
- [ ] Add team context to navigation
  - [ ] Team name in header
  - [ ] Team switching dropdown
  - [ ] Team-specific menu items
  - [ ] Role-based navigation

- [ ] Update breadcrumbs for team context
  - [ ] Show team in breadcrumbs
  - [ ] Team-specific document paths
  - [ ] Clear navigation hierarchy
  - [ ] Back to team dashboard

### 🔔 **4.3 Notification System**
- [ ] Team invitation notifications
  - [ ] Email invitations
  - [ ] In-app notifications
  - [ ] Invitation reminders
  - [ ] Acceptance confirmations

- [ ] Team activity notifications
  - [ ] New member joins
  - [ ] Document sharing
  - [ ] Role changes
  - [ ] Team updates

---

## 🔧 **PHASE 5: BUSINESS LOGIC & INTEGRATION**

### 💳 **5.1 Subscription Integration**
- [ ] Team subscription management
  - [ ] Team-level billing
  - [ ] Usage aggregation
  - [ ] Plan limits enforcement
  - [ ] Billing email management

- [ ] Usage tracking updates
  - [ ] Aggregate team usage
  - [ ] Team limit warnings
  - [ ] Individual vs team limits
  - [ ] Usage reporting

### 🔐 **5.2 Permission System**
- [ ] Role-based access control
  - [ ] Admin permissions
  - [ ] Member permissions
  - [ ] Viewer permissions
  - [ ] Custom permissions

- [ ] Document access control
  - [ ] View access
  - [ ] Comment access
  - [ ] Edit access
  - [ ] Admin access

### 📊 **5.3 Analytics Integration**
- [ ] Team usage analytics
  - [ ] Team performance metrics
  - [ ] Member activity tracking
  - [ ] Document sharing analytics
  - [ ] Team growth metrics

---

## 🧪 **PHASE 6: TESTING & VALIDATION**

### ✅ **6.1 Unit Testing**
- [ ] Database function tests
  - [ ] Team creation tests
  - [ ] Member management tests
  - [ ] Invitation system tests
  - [ ] Permission validation tests

- [ ] API route tests
  - [ ] Team management endpoints
  - [ ] Member management endpoints
  - [ ] Invitation endpoints
  - [ ] Document sharing endpoints

### 🔄 **6.2 Integration Testing**
- [ ] End-to-end team workflows
  - [ ] Team creation and setup
  - [ ] Member invitation and acceptance
  - [ ] Document sharing workflows
  - [ ] Role management workflows

- [ ] Permission system testing
  - [ ] Role-based access validation
  - [ ] Document access control
  - [ ] Team management permissions
  - [ ] Cross-team isolation

### 🚀 **6.3 User Acceptance Testing**
- [ ] Team admin workflows
  - [ ] Team creation and management
  - [ ] Member invitation and management
  - [ ] Document sharing management
  - [ ] Team settings and billing

- [ ] Team member workflows
  - [ ] Invitation acceptance
  - [ ] Document access and collaboration
  - [ ] Team switching
  - [ ] Usage monitoring

---

## 📋 **IMPLEMENTATION CHECKLIST**

### ✅ **Phase 1: Database Schema & Foundation**
- [ ] Teams table created
- [ ] Team members table created
- [ ] Team invitations table created
- [ ] Shared documents table created
- [ ] RLS policies implemented
- [ ] Database functions created
- [ ] Triggers implemented

### ✅ **Phase 2: Backend API Development**
- [ ] Team management API routes
- [ ] Team member management API routes
- [ ] Team invitation API routes
- [ ] Document sharing API routes
- [ ] API testing completed

### ✅ **Phase 3: Frontend Components**
- [ ] Team dashboard components
- [ ] Team member management components
- [ ] Invitation management components
- [ ] Document sharing components
- [ ] Component testing completed

### ✅ **Phase 4: User Interface Integration**
- [ ] Dashboard integration
- [ ] Navigation updates
- [ ] Notification system
- [ ] UI testing completed

### ✅ **Phase 5: Business Logic & Integration**
- [ ] Subscription integration
- [ ] Permission system
- [ ] Analytics integration
- [ ] Integration testing completed

### ✅ **Phase 6: Testing & Validation**
- [ ] Unit testing completed
- [ ] Integration testing completed
- [ ] User acceptance testing completed
- [ ] Performance testing completed

---

## 🎯 **SUCCESS CRITERIA**

### 📊 **Functional Requirements**
- [ ] Users can create and manage teams
- [ ] Team members can be invited and managed
- [ ] Documents can be shared with teams
- [ ] Role-based permissions work correctly
- [ ] Team usage is properly aggregated
- [ ] Invitations expire and can be revoked

### 🚀 **Performance Requirements**
- [ ] Team switching is fast (< 200ms)
- [ ] Document sharing is responsive (< 500ms)
- [ ] Team member list loads quickly (< 1s)
- [ ] Usage aggregation is efficient
- [ ] Database queries are optimized

### 🔒 **Security Requirements**
- [ ] Team data is properly isolated
- [ ] Permissions are enforced at all levels
- [ ] Invitation tokens are secure
- [ ] Document access is properly controlled
- [ ] Audit logging is implemented

### 👥 **User Experience Requirements**
- [ ] Team management is intuitive
- [ ] Invitation process is clear
- [ ] Document sharing is easy
- [ ] Role changes are transparent
- [ ] Team switching is seamless

---

## 📅 **TIMELINE & MILESTONES**

### **Week 1: Foundation**
- [ ] Database schema implementation
- [ ] Basic API routes
- [ ] Core components

### **Week 2: Core Features**
- [ ] Team management functionality
- [ ] Member invitation system
- [ ] Document sharing features

### **Week 3: Integration & Testing**
- [ ] UI integration
- [ ] Business logic integration
- [ ] Testing and validation

### **Week 4: Polish & Launch**
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Documentation and launch

---

## 🆘 **RISKS & MITIGATION**

### 🔴 **High Risk**
- **Database Performance**: Large teams with many documents
  - *Mitigation*: Implement pagination and caching
- **Permission Complexity**: Complex role-based access
  - *Mitigation*: Start with simple roles, iterate

### 🟡 **Medium Risk**
- **Email Delivery**: Invitation emails not delivered
  - *Mitigation*: Implement fallback notification methods
- **Team Switching**: Performance impact of context switching
  - *Mitigation*: Implement efficient caching strategies

### 🟢 **Low Risk**
- **UI Complexity**: Too many team management options
  - *Mitigation*: Progressive disclosure and user testing
- **Usage Aggregation**: Performance of real-time aggregation
  - *Mitigation*: Background processing and caching

---

## 📚 **RESOURCES & DEPENDENCIES**

### 🔧 **Technical Dependencies**
- [ ] Supabase database (existing)
- [ ] Next.js API routes (existing)
- [ ] React components (existing)
- [ ] Email service (to be configured)
- [ ] Stripe integration (existing)

### 👥 **Team Dependencies**
- [ ] Database schema design
- [ ] API development
- [ ] Frontend development
- [ ] Testing and QA
- [ ] User experience design

### 📖 **Documentation Dependencies**
- [ ] API documentation
- [ ] Component documentation
- [ ] User guide
- [ ] Admin guide
- [ ] Troubleshooting guide

---

**Status**: 🟡 Ready to Begin  
**Next Action**: Start Phase 1 - Database Schema & Foundation  
**Estimated Completion**: 2-3 weeks  
**Last Updated**: January 2025
