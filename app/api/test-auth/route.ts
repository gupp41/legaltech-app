import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log('🧪 TEST AUTH API: Route called')
    
    const supabase = await createClient()
    console.log('🧪 TEST AUTH API: Supabase client created')
    
    // Try to get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    console.log('🧪 TEST AUTH API: Auth result', { 
      user: user?.email, 
      userId: user?.id,
      error: authError,
      hasUser: !!user 
    })
    
    if (authError) {
      return NextResponse.json({ 
        error: "Auth error", 
        details: authError.message 
      }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: "No user session" 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      success: true, 
      user: { 
        email: user.email, 
        id: user.id 
      } 
    })
    
  } catch (error) {
    console.error('🧪 TEST AUTH API: Error:', error)
    return NextResponse.json({ 
      error: "Server error", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

