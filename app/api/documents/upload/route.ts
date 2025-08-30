import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { usageTracker } from "@/lib/usage-tracker"

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 === UPLOAD API CALLED ===')
    console.log('🚀 API: Route handler started')
    
    // Check for Authorization header first
    const authHeader = request.headers.get('authorization')
    console.log('🚀 API: Authorization header:', authHeader ? 'Present' : 'Missing')
    
    let supabase = await createClient()
    console.log('🚀 API: Supabase client created')
    
    // If we have an Authorization header, try to use it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('🚀 API: Using Bearer token authentication')
      
      // Create a new client with the token
      const { createClient: createClientWithToken } = await import('@supabase/supabase-js')
      const supabaseWithToken = createClientWithToken(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      // Try to get user with token
      const { data: { user }, error: tokenAuthError } = await supabaseWithToken.auth.getUser()
      
      if (!tokenAuthError && user) {
        console.log('🚀 API: Token authentication successful:', { user: user.email, userId: user.id })
        supabase = supabaseWithToken
      } else {
        console.log('🚀 API: Token authentication failed, falling back to cookie auth')
      }
    }
    
    // Try to get session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('🚀 API: Session check:', { 
      hasSession: !!session, 
      sessionError,
      userId: session?.user?.id 
    })
    
    // Then try to get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    console.log('🚀 API: Auth check result', { 
      user: user?.email, 
      userId: user?.id,
      error: authError,
      hasUser: !!user,
      sessionUserId: session?.user?.id
    })
    
    if (authError || !user) {
      console.log('🚀 API: Authentication failed:', authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const documentType = formData.get("documentType") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type for legal documents
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.",
        },
        { status: 400 },
      )
    }

    // Check usage limits before upload
    console.log('🚀 API: About to check usage limits for user:', user.id, 'file size:', file.size)
    const usageCheck = await usageTracker.checkUsage(user.id, 'upload', file.size)
    console.log('🚀 API: Usage check result:', usageCheck)
    
    if (!usageCheck.allowed) {
      console.log('🚀 API: Usage check failed, returning 429')
      return NextResponse.json({
        error: "Upload limit reached",
        details: usageCheck.errors,
        currentUsage: usageCheck.currentUsage,
        limits: usageCheck.limits
      }, { status: 429 })
    }

    // Show warnings if approaching limits
    if (usageCheck.warnings.length > 0) {
      console.log('Usage warnings:', usageCheck.warnings)
    }

    // Upload to Supabase Storage with organized path
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 })
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)
    
    const publicUrl = urlData.publicUrl

    // Store document metadata in database
    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        filename: file.name,
        original_filename: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: publicUrl,
        upload_status: "completed",
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save document metadata" }, { status: 500 })
    }

    // Increment usage after successful upload
    try {
      console.log('🚀 API: About to increment usage', { 
        userId: user.id, 
        fileSize: file.size, 
        fileSizeType: typeof file.size 
      })
      
      await usageTracker.incrementUsage(user.id, 'upload', file.size)
      
      console.log('✅ API: Usage incremented successfully')
    } catch (usageError) {
      console.error('❌ API: Failed to increment usage:', usageError)
      // Don't fail the upload if usage tracking fails
    }

    return NextResponse.json({
      id: document.id,
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      storage_path: publicUrl,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
