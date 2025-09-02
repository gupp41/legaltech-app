import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { usageTracker } from '@/lib/usage-tracker'
import { env } from '@/lib/config/env'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 === TEXT EXTRACTION API CALLED ===')
    
    // Check for Authorization header
    const authHeader = request.headers.get('authorization')
    
    let supabase = await createClient()
    
    // If we have an Authorization header, use it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { createClient: createClientWithToken } = await import('@supabase/supabase-js')
      const supabaseWithToken = createClientWithToken(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    // Get request body
    const { documentId, extractedText, wordCount } = await request.json()
    
    if (!documentId || !extractedText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log('🚀 API: Text extraction request for document:', documentId, 'word count:', wordCount)

    // Check usage limits before extraction
    console.log('🚀 API: About to check usage limits for text extraction')
    const usageCheck = await usageTracker.checkUsage(user.id, 'extraction')
    console.log('🚀 API: Usage check result:', usageCheck)
    
    if (!usageCheck.allowed) {
      console.log('🚀 API: Usage check failed, returning 429')
      return NextResponse.json({
        error: "Text extraction limit reached",
        details: usageCheck.errors,
        currentUsage: usageCheck.currentUsage,
        limits: usageCheck.limits
      }, { status: 429 })
    }

    // Store the extracted text in the database
    try {
      const { data: extractionRecord, error: insertError } = await supabase
        .from('text_extractions')
        .insert({
          user_id: user.id,
          document_id: documentId,
          extracted_text: extractedText,
          word_count: wordCount || 0,
          extraction_method: 'pdf_extraction'
        })
        .select()
        .single()

      if (insertError) {
        console.log('⚠️ Failed to store text extraction in database:', insertError)
        // Continue with usage tracking even if storage fails
      } else {
        console.log('✅ Text extraction stored in database:', extractionRecord.id)
      }
    } catch (storageError) {
      console.log('⚠️ Error storing text extraction:', storageError)
      // Continue with usage tracking even if storage fails
    }
    
    // Increment usage for text extraction
    try {
      console.log('🚀 API: About to increment usage for text extraction')
      
      await usageTracker.incrementUsage(user.id, 'extraction')
      
      console.log('✅ API: Text extraction usage incremented successfully')
    } catch (usageError) {
      console.error('❌ API: Failed to increment text extraction usage:', usageError)
      // Don't fail the extraction if usage tracking fails
    }

    return NextResponse.json({
      success: true,
      message: "Text extraction completed and usage tracked",
      wordCount: wordCount,
      documentId: documentId
    })
    
  } catch (error) {
    console.error('Text extraction API error:', error)
    return NextResponse.json({ error: "Text extraction failed" }, { status: 500 })
  }
}
