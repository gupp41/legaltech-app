import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const codeVerifier = searchParams.get('code_verifier')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('Callback received with params:', Object.fromEntries(searchParams.entries()))

  if (code) {
    const supabase = await createClient()
    
    try {
      let result
      
      if (codeVerifier) {
        // PKCE flow - we need to handle this differently
        console.log('PKCE flow detected, but code verifier not supported in this method')
        console.log('Code:', code)
        console.log('Code Verifier:', codeVerifier)
        // For now, try the regular flow and see what happens
        result = await supabase.auth.exchangeCodeForSession(code)
      } else {
        // Regular flow - try without code verifier
        console.log('Using regular flow without code verifier')
        result = await supabase.auth.exchangeCodeForSession(code)
      }
      
      const { data, error } = result
      
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
