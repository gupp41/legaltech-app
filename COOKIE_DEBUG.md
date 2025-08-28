# 🍪 Cookie Debug Guide

## 🚨 **Current Issue**

- ✅ **Login successful** - User authenticated
- ✅ **Session refreshed** - Session established
- ❌ **Middleware not recognizing user** - `getUser()` returns null
- ❌ **Redirect loop** - Back to login page

## 🔍 **Root Cause Analysis**

The issue is likely one of these:

1. **Cookie Names Mismatch** - Supabase looking for wrong cookie names
2. **Cookie Domain/Path Issues** - Cookies not being set for correct domain
3. **Cookie Expiration** - Cookies expiring too quickly
4. **Cookie Security Settings** - HttpOnly, Secure, SameSite issues

## 🧪 **Debug Steps**

### **Step 1: Check Browser Cookies**
1. **Open DevTools** → Application → Cookies
2. **Look for Supabase cookies**:
   - `sb-[project-ref]-auth-token`
   - `sb-[project-ref]-auth-refresh-token`
3. **Check cookie properties**:
   - Domain: should be `localhost`
   - Path: should be `/`
   - HttpOnly: should be checked
   - Secure: should be unchecked (for localhost)

### **Step 2: Check Console Logs**
Look for middleware logs:
```
Middleware auth check: { pathname: "/dashboard", user: null, ... }
Redirecting to login - no user found for path: /dashboard
User data in middleware: null
Cookies in request: [cookie names here]
```

### **Step 3: Check Network Tab**
1. **Look for cookie headers** in requests
2. **Check if cookies are being sent** to dashboard
3. **Verify cookie values** are present

## 🐛 **Common Cookie Issues**

### **Issue 1: Wrong Cookie Names**
**Symptoms:**
- No Supabase cookies in browser
- Middleware can't find auth tokens

**Solution:**
- Check Supabase project settings
- Verify cookie naming convention

### **Issue 2: Cookie Domain Issues**
**Symptoms:**
- Cookies set for wrong domain
- Cookies not accessible to middleware

**Solution:**
- Check cookie domain settings
- Ensure cookies are set for localhost

### **Issue 3: Cookie Security Settings**
**Symptoms:**
- Cookies set but not accessible
- HttpOnly or Secure flags blocking access

**Solution:**
- Check cookie security settings
- Adjust for development environment

## 🔧 **Quick Fix Attempts**

### **Fix 1: Clear and Re-login**
1. **Clear all cookies** for localhost
2. **Log out** completely
3. **Log back in** fresh
4. **Check if cookies are set** properly

### **Fix 2: Check Supabase Settings**
1. **Go to Supabase Dashboard**
2. **Check Authentication → Settings**
3. **Verify cookie settings**
4. **Check redirect URLs**

### **Fix 3: Test Cookie Access**
1. **Check browser cookies** manually
2. **Verify cookie values** are present
3. **Test cookie accessibility** in console

## 📋 **Debug Checklist**

- [ ] **Browser cookies** show Supabase auth tokens
- [ ] **Cookie properties** are correct (domain, path, etc.)
- [ ] **Middleware logs** show cookie names
- [ ] **Network requests** include cookie headers
- [ ] **No cookie errors** in console

## 🚀 **Expected Results After Fix**

1. **Middleware recognizes user** - `getUser()` returns user data
2. **Dashboard access allowed** - No redirect to login
3. **API calls work** - Authentication cookies passed through
4. **Full functionality** - Upload, list, delete documents

---

**Status**: 🟡 **Cookie Issue - Debugging Required**
**Priority**: **HIGH - Blocking dashboard access**
**Next Action**: **Check browser cookies and middleware logs**
