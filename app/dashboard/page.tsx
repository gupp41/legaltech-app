"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Trash2, BarChart3, Brain, ChevronLeft, ChevronRight, RefreshCw, Database } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { extractTextFromDocument, truncateText } from "@/lib/document-extractor"

interface Document {
  id: string
  filename: string
  file_url: string
  file_size: number
  file_type: string
  document_type: string
  status: string
  created_at: string
  storage_path?: string
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // New state for single document view
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0)
  const [showDocumentDetail, setShowDocumentDetail] = useState(false)
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<string>>(new Set())
  const [analyzingDocuments, setAnalyzingDocuments] = useState<Set<string>>(new Set())
  const [realTimeSyncActive, setRealTimeSyncActive] = useState(false)
  const [streamingAnalyses, setStreamingAnalyses] = useState<Map<string, string>>(new Map())

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    checkUser()
  }, [])

  // Fetch documents when user is available
  useEffect(() => {
    if (user?.id) {
      console.log('User available, fetching documents...')
      fetchDocuments()
      fetchAnalyses()
    }
  }, [user?.id])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, redirecting to login')
          window.location.href = '/auth/login'
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, updating user state')
          setUser(session.user)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed, updating user state')
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Real-time synchronization with Supabase
  useEffect(() => {
    if (!user?.id) return

    console.log('Setting up real-time subscriptions for user:', user.id)

    // Subscribe to documents table changes
    const documentsSubscription = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Documents real-time change:', payload)
          fetchDocuments() // Refresh documents when changes occur
        }
      )
      .subscribe((status) => {
        console.log('Documents subscription status:', status)
        if (status === 'SUBSCRIBED') {
          setRealTimeSyncActive(true)
        }
      })

    // Subscribe to analyses table changes
    const analysesSubscription = supabase
      .channel('analyses-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'analyses',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Analyses real-time change:', payload)
          fetchAnalyses() // Refresh analyses when changes occur
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      console.log('Cleaning up real-time subscriptions')
      documentsSubscription.unsubscribe()
      analysesSubscription.unsubscribe()
    }
  }, [user?.id])

  const checkUser = async () => {
    console.log('Checking user authentication...')
    
    try {
      // First try to get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        window.location.href = "/auth/login"
        return
      }
      
      if (session?.user) {
        console.log('Session found, user:', session.user.email)
        setUser(session.user)
        return
      }
      
      // If no session, try to get user directly
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Error getting user:', error)
        window.location.href = "/auth/login"
        return
      }
      
      console.log('User data:', user)
      setUser(user)
      
      if (!user) {
        console.log('No user found, redirecting to login')
        window.location.href = "/auth/login"
        return
      } else {
        console.log('User authenticated:', user.email)
      }
    } catch (error) {
      console.error('Exception in checkUser:', error)
      window.location.href = "/auth/login"
    }
  }

  const fetchDocuments = async () => {
    try {
      console.log('Fetching documents using Supabase client...')
      
      // Check if user ID is available
      if (!user?.id) {
        console.log('User ID not available yet, skipping document fetch')
        return
      }
      
      console.log('Fetching documents for user:', user.id)
      
      // Use Supabase client directly instead of API route
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase error:', error)
        setDocuments([])
      } else {
        console.log('Documents fetched:', documents)
        console.log('User ID filter:', user.id)
        console.log('Total documents in result:', documents?.length || 0)
        
        // Debug: Check if there are documents with different user IDs
        const { data: allDocuments, error: allError } = await supabase
          .from('documents')
          .select('id, user_id, filename')
          .order('created_at', { ascending: false })
        
        if (!allError && allDocuments) {
          console.log('All documents in table:', allDocuments)
          console.log('Documents by user ID:')
          const byUser = allDocuments.reduce((acc, doc) => {
            acc[doc.user_id] = (acc[doc.user_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          console.log(byUser)
        }
        
        setDocuments(documents || [])
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalyses = async () => {
    try {
      console.log('Fetching analyses using Supabase client...')
      
      // Check if user ID is available
      if (!user?.id) {
        console.log('User ID not available yet, skipping analyses fetch')
        return
      }
      
      console.log('Fetching analyses for user:', user.id)
      
      // Use Supabase client directly instead of API route
      const { data: analyses, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase analyses error:', error)
        setAnalyses([])
      } else {
        console.log('Analyses fetched:', analyses)
        setAnalyses(analyses || [])
      }
    } catch (error) {
      console.error("Error fetching analyses:", error)
      setAnalyses([])
    }
  }

  const handleUploadComplete = (file: any) => {
    fetchDocuments() // Refresh the list
  }

  // Navigation functions for single document view
  const goToNextDocument = () => {
    if (currentDocumentIndex < documents.length - 1) {
      setCurrentDocumentIndex(currentDocumentIndex + 1)
    }
  }

  const goToPreviousDocument = () => {
    if (currentDocumentIndex > 0) {
      setCurrentDocumentIndex(currentDocumentIndex - 1)
    }
  }

  const goToDocument = (index: number) => {
    if (index >= 0 && index < documents.length) {
      setCurrentDocumentIndex(index)
    }
  }

  const getCurrentDocument = () => {
    return documents[currentDocumentIndex] || null
  }

  const getCurrentDocumentAnalyses = () => {
    const currentDoc = getCurrentDocument()
    if (!currentDoc) return []
    return analyses.filter(analysis => analysis.document_id === currentDoc.id)
  }

  const syncStorageWithDatabase = async () => {
    try {
      console.log('Syncing storage bucket with database...')
      
      // Get all files in storage bucket
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('documents')
        .list('', { limit: 1000 })
      
      if (storageError) {
        console.error('Error listing storage files:', storageError)
        return
      }
      
      console.log('Storage files found:', storageFiles)
      
      // Get all documents from database
      const { data: dbDocuments, error: dbError } = await supabase
        .from('documents')
        .select('id, storage_path, filename')
        .eq('user_id', user.id)
      
      if (dbError) {
        console.error('Error fetching database documents:', dbError)
        return
      }
      
      console.log('Database documents:', dbDocuments)
      
      // Find orphaned storage files (files not in database)
      const dbPaths = new Set(dbDocuments.map(doc => doc.storage_path))
      const orphanedFiles = storageFiles.filter(file => {
        const fullPath = `${user.id}/${file.name}`
        return !dbPaths.has(fullPath)
      })
      
      console.log('Orphaned storage files:', orphanedFiles)
      
      // Clean up orphaned files
      if (orphanedFiles.length > 0) {
        const filesToRemove = orphanedFiles.map(file => `${user.id}/${file.name}`)
        console.log('Removing orphaned files:', filesToRemove)
        
        const { error: removeError } = await supabase.storage
          .from('documents')
          .remove(filesToRemove)
        
        if (removeError) {
          console.error('Error removing orphaned files:', removeError)
        } else {
          console.log('Orphaned files removed successfully')
        }
      }
      
      // Refresh documents list
      fetchDocuments()
      
    } catch (error) {
      console.error('Error syncing storage with database:', error)
    }
  }

  const handleStreamingAnalysis = async (documentId: string) => {
    try {
      console.log('🚀 Starting streaming analysis for document:', documentId)
      
      // Get the document object
      const document = documents.find(doc => doc.id === documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      console.log('📄 Document found:', document.filename)

      // Create analysis record in database first
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert({
          document_id: documentId,
          user_id: user.id,
          analysis_type: 'contract_review',
          status: 'processing'
        })
        .select()
        .single()
      
      if (analysisError) {
        throw new Error('Failed to create analysis record: ' + analysisError.message)
      }
      
      console.log('✅ Analysis record created:', analysis.id)

      // Get the actual file content from Supabase storage
      if (!document.storage_path) {
        throw new Error('Document has no storage path')
      }
      
      console.log('📥 Fetching file content from storage...')
      const { data: fileBlob, error: fileError } = await supabase.storage
        .from('documents')
        .download(document.storage_path)
      
      if (fileError) {
        throw new Error('Failed to fetch file from storage: ' + fileError.message)
      }
      
      console.log('✅ File fetched from storage, size:', fileBlob.size)

      // Create FormData with the actual file
      const formData = new FormData()
      formData.append('file', fileBlob, document.filename || 'document')
      formData.append('documentId', documentId)
      formData.append('analysisType', 'contract_review')
      formData.append('userId', user.id)
      
      // Create documentData object as expected by the API
      const documentData = {
        id: document.id,
        original_filename: document.filename || 'document',
        file_type: document.file_type || 'application/octet-stream',
        file_size: document.file_size,
        analysisId: analysis.id,
        documentContent: '' // Will be filled by server-side extraction
      }
      
      console.log('🔍 Document data being sent:', {
        documentId,
        analysisId: analysis.id,
        documentDataKeys: Object.keys(documentData),
        documentDataString: JSON.stringify(documentData)
      })
      
      formData.append('documentData', JSON.stringify(documentData))

      console.log('📤 Calling streaming API with FormData containing file')

      // Call streaming API with FormData
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          // Don't set Content-Type for FormData - browser sets it automatically
        },
        body: formData
      })

      console.log('📡 API Response status:', response.status)
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`Streaming API failed: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body for streaming')
      }

      console.log('📖 Starting to read streaming response...')
      let fullResponse = ''
      let chunkCount = 0

      while (true) {
        const { done, value } = await reader.read()
        chunkCount++
        
        if (done) {
          console.log('✅ Stream reading completed after', chunkCount, 'chunks')
          break
        }

        const chunk = new TextDecoder().decode(value)
        console.log(`📦 Chunk ${chunkCount}:`, chunk.substring(0, 100) + '...')

        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log('📝 Processing line:', line.substring(0, 100) + '...')
            
            try {
              const data = JSON.parse(line.slice(6))
              console.log('🔍 Parsed data:', data)
              
              if (data.error) {
                console.error('❌ Stream error:', data.error)
                throw new Error(data.error)
              }
              
              if (data.done) {
                console.log('✅ Streaming analysis completed')
                console.log('🚨 CRITICAL: Analysis completed with full response length:', fullResponse.length)
                
                // Store the completed analysis locally so it doesn't disappear
                const completedAnalysis = {
                  id: `temp-${Date.now()}`,
                  document_id: documentId,
                  user_id: user.id,
                  analysis_type: 'contract_review',
                  status: 'completed',
                  results: {
                    analysis: fullResponse,
                    model: 'gpt-5-nano',
                    provider: 'Vercel AI Gateway'
                  },
                  created_at: new Date().toISOString(),
                  completed_at: new Date().toISOString()
                }
                
                console.log('🚨 CRITICAL: Storing completed analysis locally:', completedAnalysis.id)
                
                // Clear streaming state
                setStreamingAnalyses(prev => {
                  const newMap = new Map(prev)
                  newMap.delete(documentId)
                  return newMap
                })
                
                // Clear loading state
                setAnalyzingDocuments(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(documentId)
                  return newSet
                })
                
                // Add the completed analysis to local state immediately
                setAnalyses(prev => [completedAnalysis, ...prev])
                
                // Don't refresh from database immediately - let the user see the local result
                // The analysis will be saved to database by the server, and will appear on next page refresh
                console.log('🚨 CRITICAL: Analysis stored locally, skipping database refresh to preserve display')
                
                // Show a success message to the user
                console.log('🎉 Analysis completed and stored locally! Check the results below.')
                return
              }
              
              if (data.content) {
                fullResponse += data.content
                console.log('📝 Content received, total length:', fullResponse.length)
                // Update streaming content in real-time
                setStreamingAnalyses(prev => new Map(prev).set(documentId, fullResponse))
              }
            } catch (e) {
              console.warn('⚠️ JSON parse error:', e, 'for line:', line)
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Streaming analysis error:', error)
      throw error
    }
  }

  const toggleAnalysisExpansion = (analysisId: string) => {
    setExpandedAnalyses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(analysisId)) {
        newSet.delete(analysisId)
      } else {
        newSet.add(analysisId)
      }
      return newSet
    })
  }

  const getLatestAnalysis = (analyses: any[]) => {
    if (analyses.length === 0) return null
    return analyses.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      console.log('Deleting document using Supabase client...')
      
      // Check if user ID is available
      if (!user?.id) {
        console.error('User ID not available for delete operation')
        return
      }

      // Get the document first to get the storage path
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        console.error('Error fetching document for deletion:', fetchError)
        return
      }

      // Delete from storage bucket first
      if (document?.storage_path) {
        console.log('Deleting file from storage:', document.storage_path)
        
        // Extract the file path from the storage_path
        const filePath = document.storage_path.split('/').slice(-2).join('/') // Get user-id/filename
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath])
        
        if (storageError) {
          console.error('Storage deletion error:', storageError)
          // Continue with database deletion even if storage fails
        } else {
          console.log('File deleted from storage successfully')
        }
      }
      
      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Supabase delete error:', error)
      } else {
        console.log('Document deleted successfully from database')
        fetchDocuments() // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting document:", error)
    }
  }

  const handleAnalyze = async (documentId: string) => {
    if (!confirm("Analyze this document with AI?")) return

    // Set loading state
    setAnalyzingDocuments(prev => new Set(prev).add(documentId))
    
    // Initialize streaming content
    setStreamingAnalyses(prev => new Map(prev).set(documentId, ''))

    try {
      console.log('Starting AI analysis for document:', documentId)
      
      // Try streaming first, fallback to regular if it fails
      try {
        await handleStreamingAnalysis(documentId)
        return // Exit early if streaming succeeds
      } catch (streamingError) {
        console.warn('Streaming failed, falling back to regular analysis:', streamingError)
        // Continue with regular analysis
      }
      
      // Check if user ID is available
      if (!user?.id) {
        console.error('User ID not available for analysis')
        return
      }
      
      // Create analysis record in database first
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert({
          document_id: documentId,
          user_id: user.id,
          analysis_type: 'contract_review',
          status: 'processing'
        })
        .select()
        .single()
      
      if (analysisError) {
        throw new Error('Failed to create analysis record: ' + analysisError.message)
      }
      
      console.log('Analysis record created:', analysis.id)
      
      // Get the document object
      const document = documents.find(doc => doc.id === documentId)
      if (!document) {
        throw new Error('Document not found')
      }
      
      // Extract text content from the document
      let documentContent = ''
      let documentText = ''
      
      try {
        console.log('Attempting to download file:', document.filename)
        
        // Use the storage_path stored in the database - this is the storage path, not a public URL
        if (document.storage_path) {
          console.log('Using stored storage_path:', document.storage_path)
          
          // Get a signed URL for secure access (expires in 1 hour)
          console.log('Getting signed URL for secure access...')
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(document.storage_path, 3600) // 1 hour expiry
          
          if (signedUrlError) {
            console.error('Failed to create signed URL:', signedUrlError)
            throw new Error(`Failed to create signed URL: ${signedUrlError.message}`)
          }
          
          const signedUrl = signedUrlData.signedUrl
          console.log('Signed URL created, expires in 1 hour')
          
          // Try to fetch from the signed URL
          try {
            console.log('Attempting fetch from signed URL...')
            const response = await fetch(signedUrl)
            console.log('Fetch response status:', response.status, response.statusText)
            
            if (response.ok) {
              const fileBlob = await response.blob()
              console.log('File blob received, size:', fileBlob.size)
              
              const file = new File([fileBlob], document.filename, { type: document.file_type })
              
              const extracted = await extractTextFromDocument(file)
              if (extracted.success) {
                documentText = extracted.text
                documentContent = truncateText(extracted.text, 8000)
                console.log(`Extracted ${extracted.wordCount} words from document via stored URL`)
              } else {
                console.warn('Text extraction failed:', extracted.error)
                // Even if text extraction fails, we successfully accessed the file
                // Don't treat this as a URL failure - the stored URL approach worked
                console.log('Stored URL approach succeeded (file accessed), but text extraction failed')
                // Set a flag to prevent fallback logic from running
                documentText = 'EXTRACTION_FAILED_BUT_FILE_ACCESSIBLE'
              }
            } else {
              console.warn('Stored URL returned status:', response.status, response.statusText)
              // Try to get more details about the error
              try {
                const errorText = await response.text()
                console.warn('Error response body:', errorText)
              } catch (e) {
                console.warn('Could not read error response body')
              }
            }
          } catch (fetchError) {
            console.warn('Failed to fetch from stored URL:', fetchError)
            if (fetchError instanceof Error) {
              console.warn('Fetch error details:', {
                name: fetchError.name,
                message: fetchError.message,
                cause: fetchError.cause
              })
            } else {
              console.warn('Fetch error (unknown type):', fetchError)
            }
          }
        }
        
        // If we still don't have content, try the fallback approach
        // Only run fallback if the stored URL approach actually failed to access the file
        if (!documentText || documentText === 'EXTRACTION_FAILED_BUT_FILE_ACCESSIBLE') {
          if (documentText === 'EXTRACTION_FAILED_BUT_FILE_ACCESSIBLE') {
            console.log('Stored URL approach succeeded (file accessible), but text extraction failed. Skipping fallback.')
            // IMPORTANT: Keep the flag so FormData logic can trigger
            console.log('Will use FormData approach for server-side processing')
          } else {
            console.log('Stored URL approach failed, trying fallback...')
            
            // Fallback: try to construct storage path and download
            const timestamp = new Date(document.created_at).getTime()
            const storagePath = `${user.id}/${timestamp}-${document.filename}`
            
            console.log('Fallback storage path:', storagePath)
            
            // First, let's see what files are available in the bucket
            const { data: bucketFiles, error: listError } = await supabase.storage
              .from('documents')
              .list()
            
            if (listError) {
              console.warn('Could not list bucket files:', listError)
            } else {
              console.log('Files in bucket:', bucketFiles)
            }
            
            // Try to download the file
            const { data: fileData, error: fileError } = await supabase.storage
              .from('documents')
              .download(storagePath)
            
            if (fileError) {
              console.warn('Could not download file for text extraction:', fileError)
              
              // Try generating a public URL as last resort
              try {
                const { data: publicUrl } = supabase.storage
                  .from('documents')
                  .getPublicUrl(storagePath)
                
                // Fix the URL to include /public segment
                const correctedUrl = publicUrl.publicUrl.replace(
                  '/storage/v1/object/documents/',
                  '/storage/v1/object/public/documents/'
                )
                
                console.log('Generated corrected public URL:', correctedUrl)
                
                // Try to fetch from corrected public URL
                const response = await fetch(correctedUrl)
                if (response.ok) {
                  const fileBlob = await response.blob()
                  const file = new File([fileBlob], document.filename, { type: document.file_type })
                  
                  const extracted = await extractTextFromDocument(file)
                  if (extracted.success) {
                    documentText = extracted.text
                    documentContent = truncateText(extracted.text, 8000)
                    console.log(`Extracted ${extracted.wordCount} words from document via corrected public URL`)
                  }
                }
              } catch (publicUrlError) {
                console.warn('Generated public URL approach also failed:', publicUrlError)
              }
            } else if (fileData) {
              // Convert Blob to File object for text extraction
              const file = new File([fileData], document.filename, { type: document.file_type })
              
              // Extract text from the file
              const extracted = await extractTextFromDocument(file)
              
              if (extracted.success) {
                documentText = extracted.text
                documentContent = truncateText(extracted.text, 8000) // Limit to 8000 chars for AI
                console.log(`Extracted ${extracted.wordCount} words from document`)
              } else {
                console.warn('Text extraction failed:', extracted.error)
                // Show user-friendly message about the limitation
                alert(`Note: ${extracted.error}\n\nFor best results, please upload a text (.txt) file or copy your document content into a text file.`)
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not extract document text, proceeding with metadata analysis:', error)
      }
      
      // If we still don't have content, provide helpful guidance
      if (!documentContent) {
        console.log('No document content extracted, proceeding with metadata-only analysis')
        
        // Check if we successfully accessed the file but extraction failed
        if (documentText === 'EXTRACTION_FAILED_BUT_FILE_ACCESSIBLE') {
          documentContent = `Document: ${document.filename}
Type: ${document.file_type}
Size: ${(document.file_size / 1024).toFixed(1)} KB

✅ File successfully accessed via stored URL
❌ Text extraction failed: This file type requires server-side processing

Will attempt server-side processing via FormData.`
        } else {
          documentContent = `Document: ${document.filename}
Type: ${document.file_type}
Size: ${(document.file_size / 1024).toFixed(1)} KB

Note: Full text extraction was not possible. For comprehensive AI analysis, please upload a text (.txt) file or copy your document content into a text file.`
        }
      }
      
              // Call Supabase AI Gateway for real analysis
        try {
          console.log('Calling analysis API...')
          
          // Prepare the document data for analysis
          let documentDataForAnalysis = {
            ...document,
            analysisId: analysis.id,
            extractedText: documentText,
            documentContent: documentContent
          }
          
          // If we have the file blob but text extraction failed, we need to send the file for server-side processing
          console.log('Checking if FormData approach should be used...')
          console.log('documentText value:', documentText)
          console.log('document.storage_path exists:', !!document.storage_path)
          
          if (documentText === 'EXTRACTION_FAILED_BUT_FILE_ACCESSIBLE' && document.storage_path) {
            console.log('✅ FormData condition met - will send file for server-side processing')
            
            try {
              // Get a signed URL for secure access (expires in 1 hour)
              console.log('Getting signed URL for FormData processing...')
              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('documents')
                .createSignedUrl(document.storage_path, 3600) // 1 hour expiry
              
              if (signedUrlError) {
                console.error('Failed to create signed URL for FormData:', signedUrlError)
                throw new Error(`Failed to create signed URL: ${signedUrlError.message}`)
              }
              
              const signedUrl = signedUrlData.signedUrl
              console.log('Signed URL created for FormData processing')
              
              const fileResponse = await fetch(signedUrl)
              if (fileResponse.ok) {
                const fileBlob = await fileResponse.blob()
                const file = new File([fileBlob], document.filename, { type: document.file_type })
                
                console.log('File prepared for server-side processing, size:', fileBlob.size)
                
                // Use FormData to send the file and document data
                const formData = new FormData()
                formData.append('file', file)
                formData.append('documentId', documentId)
                formData.append('analysisType', 'contract_review')
                formData.append('userId', user.id)
                formData.append('documentData', JSON.stringify(documentDataForAnalysis))
                
                console.log('FormData created with keys:', Array.from(formData.keys()))
                
                // Call our API route with FormData
                console.log('Sending FormData request to /api/analyze...')
                const response = await fetch('/api/analyze', {
                  method: 'POST',
                  body: formData
                })
                
                console.log('FormData response received:', response.status, response.statusText)
                
                if (!response.ok) {
                  const errorText = await response.text()
                  console.error('Analysis API error:', errorText)
                  throw new Error('Analysis failed: ' + errorText)
                }
                
                const data = await response.json()
                console.log('Analysis completed:', data)
                
                if (data.success) {
                  // Update the analysis record with results
                  const { error: updateError } = await supabase
                    .from('analyses')
                    .update({
                      status: 'completed',
                      results: data.analysis?.results || {},
                      completed_at: new Date().toISOString()
                    })
                    .eq('id', analysis.id)
                  
                  if (updateError) {
                    console.error('Failed to update analysis record:', updateError)
                  }
                  
                  // Refresh analyses list
                  fetchAnalyses()
                  
                  alert('Document analysis completed successfully! Check the analyses tab for results.')
                }
                
                // Clear loading state
                setAnalyzingDocuments(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(documentId)
                  return newSet
                })
                
                return // Exit early since we handled the response
              }
            } catch (fileError) {
              console.warn('Could not prepare file for server-side processing:', fileError)
            }
          }
        
          // If we didn't send the file (text extraction succeeded or failed), use the regular JSON approach
          console.log('Using regular JSON approach for analysis')
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentId,
              analysisType: 'contract_review',
              userId: user.id,
              documentData: documentDataForAnalysis
            })
          })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('AI Gateway error:', errorText)
          throw new Error('AI analysis failed: ' + errorText)
        }

        const data = await response.json()
        console.log('Analysis completed:', data)
        
        if (data.success) {
          // Update the analysis record with results
          const { error: updateError } = await supabase
            .from('analyses')
            .update({
              status: 'completed',
              results: data.analysis?.results || {},
              completed_at: new Date().toISOString()
            })
            .eq('id', analysis.id)
          
          if (updateError) {
            console.error('Failed to update analysis:', updateError)
          }
          
          // Refresh analyses to show the new results
          fetchAnalyses()
          
          console.log('Document analysis completed successfully!')
        } else {
          throw new Error('AI analysis failed: ' + (data.error || 'Unknown error'))
        }
        
        // Clear loading state
        setAnalyzingDocuments(prev => {
          const newSet = new Set(prev)
          newSet.delete(documentId)
          return newSet
        })
        
      } catch (error) {
        console.error('AI Gateway error:', error)
        
        // Update analysis status to failed
        await supabase
          .from('analyses')
          .update({ 
            status: 'failed',
            results: { error: 'AI analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error') }
          })
          .eq('id', analysis.id)
        
        throw new Error('AI analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
      
      // Clear loading state on error
      setAnalyzingDocuments(prev => {
        const newSet = new Set(prev)
        newSet.delete(documentId)
        return newSet
      })
      
    } catch (error) {
      console.error("Error analyzing document:", error)
      alert('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
      
      // Clear loading state on error
      setAnalyzingDocuments(prev => {
        const newSet = new Set(prev)
        newSet.delete(documentId)
        return newSet
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploaded":
        return "bg-blue-100 text-blue-800"
      case "analyzing":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Legal Document Dashboard</h1>
              <p className="text-slate-600">Upload and analyze your legal documents with AI</p>
            </div>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  console.log('Signing out...')
                  const { error } = await supabase.auth.signOut()
                  if (error) {
                    console.error('Sign out error:', error)
                  } else {
                    console.log('Sign out successful, redirecting to login')
                    window.location.href = '/auth/login'
                  }
                } catch (error) {
                  console.error('Sign out exception:', error)
                }
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <FileUpload onUploadComplete={handleUploadComplete} />
            
            {/* File Type Guidance */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">📄 Best File Types for AI Analysis</h3>
              <div className="text-xs text-blue-800 space-y-1">
                <p>✅ <strong>Text files (.txt)</strong> - Full text extraction and analysis</p>
                <p>⚠️ <strong>Word docs (.docx)</strong> - Limited text extraction</p>
                <p>⚠️ <strong>PDF files (.pdf)</strong> - Limited text extraction</p>
                <p className="mt-2 text-blue-700">
                  <strong>Tip:</strong> For best results, copy your document content into a .txt file before uploading.
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-slate-600">Total Documents</p>
                      <p className="text-xl font-bold text-slate-900">{documents.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-slate-600">Analyzed</p>
                      <p className="text-xl font-bold text-slate-900">
                        {documents.filter((d) => d.status === "completed").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Single Document View */}
          <div className="lg:col-span-2">
            {documents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No documents uploaded yet</p>
                  <p className="text-sm text-slate-500">Upload your first legal document to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Document Navigation */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                                              <CardTitle className="flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <span>Document {currentDocumentIndex + 1} of {documents.length}</span>
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                                                      <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  fetchDocuments()
                                  fetchAnalyses()
                                }}
                                className="text-xs"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Refresh
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={syncStorageWithDatabase}
                                className="text-xs"
                              >
                                <Database className="h-3 w-3 mr-1" />
                                Sync Storage
                              </Button>
                              {realTimeSyncActive && (
                                <div className="flex items-center space-x-1 text-xs text-green-600">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span>Live Sync</span>
                                </div>
                              )}
                            </div>
                        </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousDocument}
                          disabled={currentDocumentIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextDocument}
                          disabled={currentDocumentIndex === documents.length - 1}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Document Thumbnails */}
                    <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                      {documents.map((doc, index) => (
                        <button
                          key={doc.id}
                          onClick={() => goToDocument(index)}
                          className={`flex-shrink-0 p-3 border rounded-lg transition-colors ${
                            index === currentDocumentIndex
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <FileText className={`h-6 w-6 ${
                            index === currentDocumentIndex ? 'text-blue-600' : 'text-slate-400'
                          }`} />
                          <p className="text-xs mt-1 truncate w-16 text-center">
                            {doc.filename.length > 16 ? doc.filename.substring(0, 13) + '...' : doc.filename}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Current Document Details */}
                    {(() => {
                      const currentDoc = getCurrentDocument()
                      if (!currentDoc) return null
                      
                      return (
                        <div className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <FileText className="h-10 w-10 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-medium text-slate-900">{currentDoc.filename}</h3>
                                <div className="flex items-center space-x-4 mt-2">
                                  <Badge className={getStatusColor(currentDoc.status)}>{currentDoc.status}</Badge>
                                  <Badge variant="outline">{currentDoc.document_type}</Badge>
                                  <span className="text-sm text-slate-500">{formatFileSize(currentDoc.file_size)}</span>
                                  <span className="text-sm text-slate-500">
                                    {formatDistanceToNow(new Date(currentDoc.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                onClick={() => handleAnalyze(currentDoc.id)}
                                disabled={analyzingDocuments.has(currentDoc.id)}
                                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                              >
                                {analyzingDocuments.has(currentDoc.id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-white"></div>
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    <Brain className="h-4 w-4 mr-2" />
                                    Analyze with AI
                                  </>
                                )}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => window.open(currentDoc.file_url, "_blank")}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(currentDoc.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Current Document Analyses */}
                {(() => {
                  const currentDoc = getCurrentDocument()
                  const currentAnalyses = getCurrentDocumentAnalyses()
                  const latestAnalysis = getLatestAnalysis(currentAnalyses)
                  
                  if (!currentDoc || currentAnalyses.length === 0) return null
                  
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Brain className="h-5 w-5" />
                          <span>AI Analysis Results for "{currentDoc.filename}"</span>
                          {currentAnalyses.length > 1 && (
                            <Badge variant="outline" className="ml-2">
                              {currentAnalyses.length} analyses
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Show latest analysis by default */}
                          {latestAnalysis && (
                            <div className="border border-slate-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(latestAnalysis.status)}>
                                    {latestAnalysis.status}
                                  </Badge>
                                  <span className="text-sm text-slate-500">
                                    Latest analysis - {formatDistanceToNow(new Date(latestAnalysis.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Display analysis content with proper formatting */}
                              {latestAnalysis.results?.analysis ? (
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {latestAnalysis.results.analysis}
                                </div>
                              ) : latestAnalysis.results && Object.keys(latestAnalysis.results).length > 0 ? (
                                <div className="prose prose-sm max-w-none">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(latestAnalysis.results, null, 2)}
                                  </pre>
                                </div>
                              ) : (
                                <p className="text-slate-500">Analysis in progress...</p>
                              )}
                            </div>
                          )}

                          {/* Show streaming analysis or loading indicator */}
                          {analyzingDocuments.has(currentDoc?.id || '') && (
                            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <div>
                                  <p className="text-sm font-medium text-blue-900">AI Analysis in Progress</p>
                                  <p className="text-xs text-blue-700">Analyzing your document in real-time...</p>
                                </div>
                              </div>
                              
                              {/* Show streaming content if available */}
                              {streamingAnalyses.has(currentDoc?.id || '') && (
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <p className="text-xs text-blue-700 mb-2">Live Analysis:</p>
                                  <div className="whitespace-pre-wrap text-sm text-blue-900 bg-white p-3 rounded border max-h-96 overflow-y-auto">
                                    {streamingAnalyses.get(currentDoc?.id || '') || ''}
                                    <span className="animate-pulse">▋</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Show other analyses if expanded */}
                          {currentAnalyses.length > 1 && (
                            <div className="border-t pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-slate-700">Previous Analyses</h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const allIds = currentAnalyses.map(a => a.id)
                                    if (expandedAnalyses.size === allIds.length) {
                                      setExpandedAnalyses(new Set())
                                    } else {
                                      setExpandedAnalyses(new Set(allIds))
                                    }
                                  }}
                                >
                                  {expandedAnalyses.size === currentAnalyses.length ? 'Collapse All' : 'Expand All'}
                                </Button>
                              </div>
                              
                              <div className="space-y-3">
                                {currentAnalyses
                                  .filter(analysis => analysis.id !== latestAnalysis?.id)
                                  .map((analysis) => (
                                    <div
                                      key={analysis.id}
                                      className="border border-slate-200 rounded-lg p-3"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <Badge className={getStatusColor(analysis.status)}>
                                            {analysis.status}
                                          </Badge>
                                          <span className="text-sm text-slate-500">
                                            {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleAnalysisExpansion(analysis.id)}
                                        >
                                          {expandedAnalyses.has(analysis.id) ? 'Collapse' : 'Expand'}
                                        </Button>
                                      </div>
                                      
                                      {/* Show analysis content only if expanded */}
                                      {expandedAnalyses.has(analysis.id) && (
                                        <div className="mt-3 pt-3 border-t">
                                          {analysis.results?.analysis ? (
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                              {analysis.results.analysis}
                                            </div>
                                          ) : analysis.results && Object.keys(analysis.results).length > 0 ? (
                                            <div className="prose prose-sm max-w-none">
                                              <pre className="whitespace-pre-wrap">
                                                {JSON.stringify(analysis.results, null, 2)}
                                              </pre>
                                            </div>
                                          ) : (
                                            <p className="text-slate-500">Analysis in progress...</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  )
}
