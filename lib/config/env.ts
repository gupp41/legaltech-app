/**
 * Centralized environment configuration
 * All environment variables should be accessed through this file
 */

export const env = {
  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  
  // App
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  
  // AI
  GROK_API_KEY: process.env.GROK_API_KEY!,
  
  // Storage
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN!,
} as const

/**
 * Validate that all required environment variables are present
 */
export function validateEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'GROK_API_KEY',
    'BLOB_READ_WRITE_TOKEN',
  ] as const

  const missing = required.filter(key => !env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * Check if we're in development mode
 */
export const isDev = process.env.NODE_ENV === 'development'

/**
 * Check if we're in production mode
 */
export const isProd = process.env.NODE_ENV === 'production'
