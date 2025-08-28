import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log('=== LIST API CALLED ===')
    
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

    // Get user's documents from database
    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Error listing documents:", error)
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 })
  }
}
