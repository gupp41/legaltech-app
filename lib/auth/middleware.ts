import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/config/env'

/**
 * Authentication middleware for API routes
 * Validates user authentication and returns user data
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    // Create Supabase client for server-side authentication
    const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
        },
      },
    })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      )
    }

    // Call the actual handler with authenticated user
    return await handler(request, user)
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Service role authentication for admin operations
 * Bypasses RLS and uses service role key
 */
export async function withServiceRole(
  request: NextRequest,
  handler: (request: NextRequest, supabase: any) => Promise<NextResponse>
) {
  try {
    // Create Supabase client with service role key
    const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No cookies needed for service role
        },
      },
    })

    // Call the actual handler with service role client
    return await handler(request, supabase)
  } catch (error) {
    console.error('Service role middleware error:', error)
    return NextResponse.json(
      { error: 'Service authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Optional authentication - doesn't fail if user is not authenticated
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any | null) => Promise<NextResponse>
) {
  try {
    // Create Supabase client for server-side authentication
    const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
        },
      },
    })

    // Get user (may be null)
    const { data: { user } } = await supabase.auth.getUser()

    // Call the actual handler with user (may be null)
    return await handler(request, user)
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
