import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { usageTracker } from "@/lib/usage-tracker"

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPLOAD API CALLED ===')
    
    const supabase = await createClient()
    console.log('Supabase client created')

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    console.log('Auth check result:', { user: user?.email, error: authError })
    
    if (authError || !user) {
      console.log('Authentication failed:', authError)
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
    const usageCheck = await usageTracker.checkUsage(user.id, 'upload', file.size)
    
    if (!usageCheck.allowed) {
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

    // Upload to Vercel Blob with organized path
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const blob = await put(fileName, file, {
      access: "public",
    })

    // Store document metadata in database
    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        filename: file.name,
        original_filename: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: blob.url,
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
      await usageTracker.incrementUsage(user.id, 'upload', file.size)
    } catch (usageError) {
      console.error('Failed to increment usage:', usageError)
      // Don't fail the upload if usage tracking fails
    }

    return NextResponse.json({
      id: document.id,
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      storage_path: blob.url,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
