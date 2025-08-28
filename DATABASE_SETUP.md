# 🗄️ Database Setup Guide

## ✅ **Environment Variables Configured**

Great! You have:
- ✅ Supabase URL and Key
- ✅ Grok AI API Key
- ✅ Vercel Blob Token

## 🗄️ **Next Step: Database Schema**

You need to create the database tables in Supabase.

### **Step 1: Access Supabase Dashboard**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**

### **Step 2: Run Database Schema**
Copy and paste each script:

#### **Script 1: Main Schema**
```sql
-- Copy the entire contents of scripts/001_create_database_schema.sql
-- This creates: profiles, documents, analyses, shared_documents tables
```

#### **Script 2: Sharing Table**
```sql
-- Copy the entire contents of scripts/002_add_sharing_table.sql
-- This creates: document_shares table
```

### **Step 3: Verify Tables Created**
Go to **Table Editor** → You should see:
- `profiles`
- `documents` 
- `analyses`
- `shared_documents`
- `document_shares`

## 🔐 **Configure Authentication**

### **Step 1: Set Redirect URLs**
Go to **Authentication** → **Settings** → **URL Configuration**

Add these URLs:
```
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
http://localhost:3000/auth/login
```

### **Step 2: Enable Email Auth**
Go to **Authentication** → **Providers** → **Email**
- ✅ Enable "Enable email confirmations"
- ✅ Enable "Enable email change confirmations"

## 🧪 **Test the Setup**

### **1. Start the App**
```bash
npm run dev
```

### **2. Test Authentication**
- Visit `http://localhost:3000`
- Click "Get Started" or go to `/auth/signup`
- Create a new account
- You should be redirected to dashboard

### **3. Test File Upload**
- Go to dashboard
- Try uploading a document
- Check if it appears in the list

## 🐛 **Common Issues & Solutions**

### **"Table doesn't exist" Error**
- Run the database schema scripts
- Check Table Editor for created tables

### **"Invalid redirect URL" Error**
- Add the redirect URLs in Supabase Auth settings
- Make sure URLs match exactly

### **"Unauthorized" Error**
- Check if user is logged in
- Verify Row Level Security policies are working

### **File Upload Fails**
- Check Vercel Blob token
- Verify file size limits
- Check browser console for errors

## 📋 **Quick Checklist**

- [ ] Environment variables set in `.env.local`
- [ ] Database schema scripts run in Supabase
- [ ] Redirect URLs configured in Supabase Auth
- [ ] App starts without errors (`npm run dev`)
- [ ] Can sign up new user
- [ ] Can access dashboard
- [ ] Can upload documents
- [ ] Documents appear in list

## 🚀 **After Successful Setup**

1. **Test all features** - Upload, analyze, export
2. **Customize AI prompts** - Modify analysis logic
3. **Add more document types** - Extend file validation
4. **Deploy to production** - Deploy to Vercel

---

**Status**: 🟡 **Environment Ready - Database Setup Required**
**Next Action**: Run database schema scripts in Supabase
