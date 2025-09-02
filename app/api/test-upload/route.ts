import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { usageTracker } from '@/lib/usage-tracker'
import { env } from '@/lib/config/env'

export async function POST(request: NextRequest) {
  try {
    // Check for Authorization header
    const authHeader = request.headers.get('authorization')
    
    let supabase = await createClient()
    
    // If we have an Authorization header, use it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { createClient: createClientWithToken } = await import('@supabase/supabase-js')
      const supabaseWithToken = createClientWithToken(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      const { data: { user }, error: tokenAuthError } = await supabaseWithToken.auth.getUser()
      if (!tokenAuthError && user) {
        supabase = supabaseWithToken
      }
    }
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🔍 DEBUG: Testing usage tracking for user:', user.id)
    
    // Get actual documents from database
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
    
    if (docsError) {
      console.error('❌ Error fetching documents:', docsError)
    } else {
      console.log('📄 Documents in database:', documents?.length || 0)
      console.log('📄 Document details:', documents?.map(d => ({
        id: d.id,
        filename: d.filename,
        file_size: d.file_size,
        created_at: d.created_at
      })))
    }
    
    // Get actual analyses from database
    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
    
    if (analysesError) {
      console.error('❌ Error fetching analyses:', analysesError)
    } else {
      console.log('🤖 Analyses in database:', analyses?.length || 0)
    }
    
    // Get actual text extractions from database
    const { data: extractions, error: extractionsError } = await supabase
      .from('text_extractions')
      .select('*')
      .eq('user_id', user.id)
    
    if (extractionsError) {
      console.error('❌ Error fetching extractions:', extractionsError)
    } else {
      console.log('📝 Text extractions in database:', extractions?.length || 0)
    }
    
    // Check what usage tracker thinks
    const usageCheck = await usageTracker.checkUsage(user.id, 'upload', 1000)
    
    return NextResponse.json({
      message: 'Usage tracking test completed',
      databaseCounts: {
        documents: documents?.length || 0,
        analyses: analyses?.length || 0,
        extractions: extractions?.length || 0
      },
      usageTrackerCounts: usageCheck.currentUsage,
      limits: usageCheck.limits,
      allowed: usageCheck.allowed
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}
