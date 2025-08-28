# LegalTech App Setup Guide

## Prerequisites
- Node.js 18+ and pnpm installed
- Supabase account and project
- Vercel account (for Blob storage)
- Grok API access

## 1. Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel Blob Configuration
BLOB_READ_WRITE_TOKEN=your_blob_token

# Grok AI Configuration
GROK_API_KEY=your_grok_api_key
```

### Getting Supabase Credentials:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select existing one
3. Go to Settings > API
4. Copy the Project URL and anon/public key

### Getting Vercel Blob Token:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new Blob store
3. Copy the read/write token

### Getting Grok API Key:
1. Visit [Grok AI](https://grok.x.ai/)
2. Sign up and get your API key

## 2. Database Setup

Run the database schema scripts in your Supabase project:

1. Go to Supabase Dashboard > SQL Editor
2. Run `scripts/001_create_database_schema.sql`
3. Run `scripts/002_add_sharing_table.sql`

## 3. Supabase Configuration

### Authentication Settings:
1. Go to Authentication > Settings
2. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/auth/login`

### Row Level Security:
The schema automatically enables RLS on all tables. Verify the policies are created correctly.

## 4. Install Dependencies

```bash
pnpm install
```

## 5. Run the Application

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## 6. Testing the Setup

1. Visit `http://localhost:3000`
2. Sign up with a new account
3. Upload a test document
4. Test the AI analysis features

## Troubleshooting

### Common Issues:

1. **Supabase Connection Error**: Verify your environment variables are correct
2. **Database Schema Error**: Ensure you're running the SQL scripts in the correct order
3. **File Upload Issues**: Check your Vercel Blob configuration
4. **AI Analysis Errors**: Verify your Grok API key is valid

### Environment Variable Issues:
- Make sure `.env.local` is in the root directory
- Restart your development server after adding environment variables
- Check that variable names match exactly (case-sensitive)

## Features Overview

✅ **Authentication System**: Role-based signup with Supabase
✅ **File Management**: Secure upload/download with Vercel Blob
✅ **AI Analysis**: Contract analysis powered by Grok
✅ **Dashboard**: Professional interface with document management
✅ **Export & Sharing**: Multiple formats with secure link generation
✅ **Responsive Design**: Mobile-friendly interface

## Next Steps

1. **Customize AI Prompts**: Modify the analysis prompts in the API routes
2. **Add Stripe Integration**: Implement subscription plans
3. **Enhanced Security**: Add additional encryption layers
4. **Analytics**: Implement usage tracking and reporting
5. **Deployment**: Deploy to Vercel for production use

## Support

For issues or questions, check the Supabase and Vercel documentation, or review the code comments for implementation details.
