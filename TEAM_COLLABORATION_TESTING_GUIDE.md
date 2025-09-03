# 🧪 Team Collaboration System Testing Guide

## 📋 Current Status

✅ **Phase 1**: Database Schema & Foundation - **COMPLETED**  
✅ **Phase 2**: Backend API Development (Partial) - **COMPLETED**  
🔄 **Testing**: API Endpoints - **IN PROGRESS**  

## 🚨 Current Issue

The API endpoints are returning **500 Internal Server Error** instead of **401 Unauthorized**. This indicates that the database schema hasn't been applied yet.

## 🔧 Solution: Apply Database Schema

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to **SQL Editor**

2. **Apply the Simplified Schema**
   - Copy the contents of `scripts/007_create_team_schema_simple.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute

3. **Verify Tables Created**
   - Go to **Table Editor**
   - Check that these tables exist:
     - `teams`
     - `team_members`
     - `team_invitations`
     - `team_document_shares`
     - `team_usage_tracking`

### Option 2: Command Line (if you have psql access)

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the schema script
\i scripts/007_create_team_schema_simple.sql
```

## 🧪 Testing Steps

### Step 1: Verify Schema Application

After applying the schema, run the database connection test:

```bash
node test-database-connection.js
```

**Expected Output:**
```
🔍 Testing database connection...

1️⃣ Testing Supabase connection...
   ✅ Supabase connection successful

2️⃣ Checking if team tables exist...
   ✅ Table 'teams' exists
   ✅ Table 'team_members' exists
   ✅ Table 'team_invitations' exists
   ✅ Table 'team_document_shares' exists
   ✅ Table 'team_usage_tracking' exists
```

### Step 2: Test API Endpoints

Once tables exist, test the API endpoints:

```bash
node test-team-api.js
```

**Expected Output:**
```
🧪 Testing Team Collaboration API...

1️⃣ Testing GET /api/teams (unauthenticated)...
   Status: 401
   Expected: 401 (Unauthorized)
   Actual: ✅ PASS

2️⃣ Testing POST /api/teams (unauthenticated)...
   Status: 401
   Expected: 401 (Unauthorized)
   Actual: ✅ PASS

3️⃣ Testing GET /api/teams/test-id (unauthenticated)...
   Status: 401
   Expected: 401 (Unauthorized)
   Actual: ✅ PASS

4️⃣ Testing PUT /api/teams/test-id (unauthenticated)...
   Status: 401
   Expected: 401 (Unauthorized)
   Actual: ✅ PASS

5️⃣ Testing DELETE /api/teams/test-id (unauthenticated)...
   Status: 401
   Expected: 401 (Unauthorized)
   Actual: ✅ PASS

✅ All unauthenticated tests completed!
```

### Step 3: Test Authenticated Endpoints

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application:**
   - Go to `http://localhost:3001`
   - Log in with your account

3. **Test team creation:**
   - Open browser dev tools (F12)
   - Go to **Network** tab
   - Try to create a team (you'll need to implement the UI first)
   - Check the API calls in the Network tab

## 🎯 What We've Implemented

### ✅ Database Schema
- **5 new tables** for team collaboration
- **Foreign key relationships** with existing tables
- **Indexes** for performance optimization
- **Views** for common queries
- **Functions** for team management
- **Triggers** for automatic personal team creation

### ✅ API Routes
- **GET /api/teams** - List user's teams
- **POST /api/teams** - Create new team
- **GET /api/teams/[id]** - Get team details
- **PUT /api/teams/[id]** - Update team settings
- **DELETE /api/teams/[id]** - Delete team

### ✅ Security Features
- **Authentication required** for all endpoints
- **Role-based permissions** (admin, member, viewer)
- **Team membership validation**
- **Proper error handling**

## 🚀 Next Steps After Testing

1. **If tests pass**: Continue with Phase 2 completion
2. **If tests fail**: Debug the specific issues
3. **Implement frontend components** for team management
4. **Add team member management** API routes
5. **Implement invitation system**

## 📊 Progress Tracking

- **Phase 1**: ✅ 100% Complete
- **Phase 2**: 🔄 40% Complete (2/5 API route groups done)
- **Testing**: 🔄 20% Complete
- **Overall**: 🔄 35% Complete

## 🆘 Troubleshooting

### If you get 500 errors:
1. Check that the database schema has been applied
2. Verify all tables exist in Supabase dashboard
3. Check the server logs for specific error messages

### If you get 401 errors (expected):
1. This means authentication is working correctly
2. Test with authenticated requests
3. Implement the frontend to test authenticated endpoints

### If tables don't exist:
1. Apply the schema script in Supabase dashboard
2. Check for any SQL errors during execution
3. Verify the script ran completely

---

**Status**: Ready for Schema Application and Testing  
**Next Action**: Apply database schema in Supabase dashboard  
**Estimated Time**: 10-15 minutes for schema application and testing
