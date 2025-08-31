import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('Callback received with params:', Object.fromEntries(searchParams.entries()))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successfully confirmed email and created session
      console.log('Email confirmation successful, redirecting to dashboard')
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('Email confirmation error:', error)
      // If there's an error, redirect to login with error message
      return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
    }
  }

  // If there's no code, redirect to login
  console.log('No confirmation code found, redirecting to login')
  return NextResponse.redirect(`${origin}/auth/login`)
}
