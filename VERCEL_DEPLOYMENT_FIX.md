# Vercel Deployment Fix: Supabase Redirect URLs

## 🚨 **Problem**
When users sign up on your live Vercel site, they get redirected to `localhost:3000` instead of your production URL after email verification.

## 🔍 **Root Cause**
Supabase project settings still have `localhost:3000` as the redirect URL, not your Vercel production URL.

## 🛠️ **Solution**

### **Step 1: Update Supabase Project Settings**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `mkmeiitbdbhhpbkfyqir`
3. Go to **Authentication** → **URL Configuration**
4. Update these fields:

#### **Site URL**
```
https://your-app-name.vercel.app
```

#### **Redirect URLs** (add these)
```
https://your-app-name.vercel.app/dashboard
https://your-app-name.vercel.app/auth/callback
https://your-app-name.vercel.app/auth/verify-email
```

### **Step 2: Code Changes Made**

Updated `app/auth/signup/page.tsx` to use Vercel URL when available:

```typescript
emailRedirectTo: process.env.NEXT_PUBLIC_VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/dashboard`
  : `${window.location.origin}/dashboard`,
```

### **Step 3: Vercel Environment Variables**

Vercel automatically sets `NEXT_PUBLIC_VERCEL_URL` for you, so no additional configuration needed.

## ✅ **After Fix**

1. New user signups will redirect to your Vercel production URL
2. Email verification links will work correctly
3. Users will land on your live dashboard instead of localhost

## 🔄 **Test the Fix**

1. Deploy the updated code to Vercel
2. Try signing up as a new user
3. Check that the email verification link redirects to your Vercel URL
4. Verify the user lands on the dashboard correctly

## 📝 **Note**

The `NEXT_PUBLIC_VERCEL_URL` environment variable is automatically provided by Vercel and contains your deployment URL (e.g., `your-app-name.vercel.app`).
