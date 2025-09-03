import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  BLOB_READ_WRITE_TOKEN: z.string().min(1, 'BLOB_READ_WRITE_TOKEN is required'),
  GROK_API_KEY: z.string().min(1, 'GROK_API_KEY is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_PRICE_ID_PLUS_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_PLUS_YEARLY: z.string().optional(),
  STRIPE_PRICE_ID_MAX_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_MAX_YEARLY: z.string().optional(),
})

// Parse environment variables with better error handling
let env: z.infer<typeof envSchema>

// Check if we're on the client side
const isClient = typeof window !== 'undefined'

if (isClient) {
  // On client side, only use NEXT_PUBLIC_ variables
  console.log('🔍 Client-side environment variables:')
  console.log('🔍 NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing')
  console.log('🔍 NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing')
  
  env = {
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: '', // Not available on client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    BLOB_READ_WRITE_TOKEN: '', // Not available on client
    GROK_API_KEY: '', // Not available on client
    STRIPE_SECRET_KEY: '', // Not available on client
    STRIPE_WEBHOOK_SECRET: '', // Not available on client
    STRIPE_PRICE_ID_PLUS_MONTHLY: process.env.STRIPE_PRICE_ID_PLUS_MONTHLY,
    STRIPE_PRICE_ID_PLUS_YEARLY: process.env.STRIPE_PRICE_ID_PLUS_YEARLY,
    STRIPE_PRICE_ID_MAX_MONTHLY: process.env.STRIPE_PRICE_ID_MAX_MONTHLY,
    STRIPE_PRICE_ID_MAX_YEARLY: process.env.STRIPE_PRICE_ID_MAX_YEARLY,
  }
} else {
  // On server side, try to parse all environment variables
  try {
    env = envSchema.parse(process.env)
  } catch (error) {
    console.error('Environment validation failed:', error)
    // Fallback to process.env with defaults
    env = {
      NODE_ENV: process.env.NODE_ENV as 'development' | 'test' | 'production' || 'development',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
      GROK_API_KEY: process.env.GROK_API_KEY || '',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
      STRIPE_PRICE_ID_PLUS_MONTHLY: process.env.STRIPE_PRICE_ID_PLUS_MONTHLY,
      STRIPE_PRICE_ID_PLUS_YEARLY: process.env.STRIPE_PRICE_ID_PLUS_YEARLY,
      STRIPE_PRICE_ID_MAX_MONTHLY: process.env.STRIPE_PRICE_ID_MAX_MONTHLY,
      STRIPE_PRICE_ID_MAX_YEARLY: process.env.STRIPE_PRICE_ID_MAX_YEARLY,
    }
  }
}

export { env }

/**
 * Validate that all required environment variables are present
 */
export function validateEnv() {
  try {
    envSchema.parse(process.env)
    return true
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(err => err.path.join('.'))
      throw new Error(`Missing or invalid environment variables: ${missing.join(', ')}`)
    }
    throw error
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
