# 🗄️ Supabase Storage Setup Guide

## 🎯 **What We've Fixed**

Instead of fighting with API route authentication, I've converted the app to use **Supabase client directly**:

- ✅ **Dashboard** - Uses Supabase client for document list
- ✅ **File Upload** - Uses Supabase Storage directly
- ✅ **Document Delete** - Uses Supabase client directly
- ✅ **No more API routes** - Bypasses authentication issues

## 🗄️ **Setup Supabase Storage**

### **Step 1: Create Storage Bucket**
1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New Bucket"**
3. **Bucket name**: `documents`
4. **Public bucket**: ✅ **Check this** (for file access)
5. **File size limit**: `50MB` (or your preferred limit)
6. Click **"Create bucket"**

### **Step 2: Set Storage Policies**
Go to **Storage** → **Policies** and add these policies:

#### **Policy 1: Allow authenticated users to upload**
```sql
-- Policy name: "Allow authenticated users to upload"
-- Target: documents bucket
-- Policy: INSERT
-- Using: auth.uid() IS NOT NULL
```

#### **Policy 2: Allow users to view their own files**
```sql
-- Policy name: "Allow users to view their own files"
-- Target: documents bucket
-- Policy: SELECT
-- Using: auth.uid()::text = (storage.foldername(name))[1]
```

#### **Policy 3: Allow users to delete their own files**
```sql
-- Policy name: "Allow users to delete their own files"
-- Target: documents bucket
-- Policy: DELETE
-- Using: auth.uid()::text = (storage.foldername(name))[1]
```

### **Step 3: Test the Setup**
1. **Login** to your app
2. **Go to dashboard**
3. **Try uploading** a document
4. **Check if it appears** in the list

## 🧪 **How It Works Now**

### **File Upload Flow:**
1. **User selects file** → Dropzone component
2. **Supabase client** gets current user
3. **File uploaded** to Supabase Storage
4. **Metadata stored** in database
5. **Document appears** in list immediately

### **Document Management:**
1. **List documents** → Direct Supabase query
2. **Delete documents** → Direct Supabase delete
3. **No API routes** → No authentication issues

## 🎯 **Expected Results**

After storage setup:
- ✅ **File upload works** without 401 errors
- ✅ **Documents appear** in the list
- ✅ **Delete functionality** works
- ✅ **No more authentication loops**

## 🔧 **If Storage Setup Fails**

### **Check 1: Bucket Creation**
- Verify bucket name is exactly `documents`
- Ensure bucket is marked as public
- Check bucket exists in Storage tab

### **Check 2: Policies**
- Verify policies are applied to `documents` bucket
- Check policy conditions match the examples above
- Ensure policies are enabled

### **Check 3: Console Errors**
- Look for storage-related errors
- Check if bucket name matches in code
- Verify user authentication is working

## 🚀 **Next Steps After Success**

1. **Test file upload** with different file types
2. **Verify documents** appear in list
3. **Test delete functionality**
4. **Configure AI analysis** features
5. **Deploy to production**

---

**Status**: 🟢 **Authentication Issues Bypassed - Storage Setup Required**
**Priority**: **HIGH - Complete file upload functionality**
**Next Action**: **Set up Supabase Storage bucket and policies**
