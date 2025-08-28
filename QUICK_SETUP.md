# 🚀 Quick Setup Guide - Fix Build Issues

## 🚨 **Immediate Issues to Fix**

### 1. **Missing Environment Variables** (CRITICAL)
The build is failing because Supabase credentials are missing.

**Create `.env.local` file in your project root:**
```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel Blob Configuration (REQUIRED)
BLOB_READ_WRITE_TOKEN=your_blob_token_here

# Grok AI Configuration (REQUIRED)
GROK_API_KEY=your_grok_api_key_here
```

### 2. **Node.js Version Warning** (RECOMMENDED)
Supabase recommends Node.js 20+ but you have Node.js 18.

**Option A: Upgrade Node.js (Recommended)**
```bash
# Using nvm (if you have it)
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

**Option B: Continue with Node.js 18 (Will work but with warnings)**

## 🔧 **Step-by-Step Setup**

### **Step 1: Get Supabase Credentials**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project or select existing
3. Go to Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **Step 2: Get Vercel Blob Token**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create new Blob store
3. Copy read/write token → `BLOB_READ_WRITE_TOKEN`

### **Step 3: Get Grok AI Key**
1. Visit [Grok AI](https://grok.x.ai/)
2. Sign up and get API key → `GROK_API_KEY`

### **Step 4: Create Environment File**
```bash
# In your project root directory
touch .env.local

# Add the configuration above to .env.local
```

### **Step 5: Test Build**
```bash
npm run build
```

## ✅ **Expected Results**

After setting up `.env.local`:
- ✅ Build should complete successfully
- ✅ No more "Supabase client" errors
- ✅ App ready for development

## 🧪 **Test the App**

```bash
# Start development server
npm run dev

# Visit http://localhost:3000
# Should see the landing page without errors
```

## 🐛 **If Build Still Fails**

### **Check Environment Variables**
```bash
# Verify .env.local exists and has content
cat .env.local

# Should show your actual values, not placeholders
```

### **Restart Development Server**
```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### **Clear Next.js Cache**
```bash
rm -rf .next
npm run build
```

## 📚 **Next Steps After Successful Build**

1. **Set up database schema** (see SETUP.md)
2. **Configure Supabase auth redirects**
3. **Test authentication flow**
4. **Upload test documents**
5. **Test AI analysis features**

---

**Status**: 🟡 Environment Configuration Required
**Priority**: HIGH - Fix environment variables to resolve build errors
