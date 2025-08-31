import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('Callback received with params:', Object.fromEntries(searchParams.entries()))

  if (code) {
    const supabase = await createClient()
    
    try {
      // Try to exchange the code for a session (works for both email confirmation and magic links)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Session exchange error:', error)
        return NextResponse.redirect(`${origin}/auth/login?error=session_failed`)
      }
      
      if (data.session) {
        // Successfully authenticated, redirect to dashboard
        console.log('Authentication successful, redirecting to dashboard')
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        console.error('No session returned')
        return NextResponse.redirect(`${origin}/auth/login?error=no_session`)
      }
    } catch (error) {
      console.error('Unexpected error in callback:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=unexpected`)
    }
  }

  // If there's no code, redirect to login
  console.log('No confirmation code found, redirecting to login')
  return NextResponse.redirect(`${origin}/auth/login`)
}
