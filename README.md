# LegalTech AI App

An AI-powered legal document analysis platform built with Next.js, Supabase, and Grok AI.

## 🚀 Quick Start

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file with:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   BLOB_READ_WRITE_TOKEN=your_blob_token
   GROK_API_KEY=your_grok_api_key
   ```

3. **Set up database:**
   - Run `scripts/001_create_database_schema.sql` in Supabase
   - Run `scripts/002_add_sharing_table.sql` in Supabase

4. **Start development server:**
   ```bash
   pnpm dev
   ```

## ✨ Features

- **Secure Authentication** - Role-based user management with Supabase
- **Document Management** - Upload, store, and organize legal documents
- **AI Analysis** - Contract analysis powered by Grok AI
- **Export & Sharing** - Multiple formats with secure link generation
- **Professional Dashboard** - Clean interface for legal professionals

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage)
- **AI**: Grok AI for document analysis
- **Storage**: Vercel Blob for file management
- **UI Components**: Radix UI + shadcn/ui

## 📁 Project Structure

```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Main dashboard
├── components/            # Reusable UI components
├── lib/                   # Utility libraries
├── scripts/               # Database schemas
└── styles/                # Global styles
```

## 🔧 Configuration

See `SETUP.md` for detailed configuration instructions.

## 📱 Usage

1. Sign up with your role (lawyer, HR manager, etc.)
2. Upload legal documents (PDF, DOC, DOCX, TXT)
3. Use AI analysis to review contracts
4. Export results or share securely

## 🚀 Deployment

Deploy to Vercel with:
```bash
vercel --prod
```

## 📄 License

MIT License - see LICENSE file for details.
