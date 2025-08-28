"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Trash2, BarChart3, Brain } from "lucide-react"
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

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      console.log('Deleting document using Supabase client...')
      
      // Check if user ID is available
      if (!user?.id) {
        console.error('User ID not available for delete operation')
        return
      }
      
      // Use Supabase client directly instead of API route
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Supabase delete error:', error)
      } else {
        console.log('Document deleted successfully')
        fetchDocuments() // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting document:", error)
    }
  }

  const handleAnalyze = async (documentId: string) => {
    if (!confirm("Analyze this document with AI?")) return

    try {
      console.log('Starting AI analysis for document:', documentId)
      
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
      
    } catch (error) {
      console.error("Error analyzing document:", error)
      alert('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
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

          {/* Documents List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Your Documents</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No documents uploaded yet</p>
                    <p className="text-sm text-slate-500">Upload your first legal document to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <FileText className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{doc.filename}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                              <Badge variant="outline">{doc.document_type}</Badge>
                              <span className="text-xs text-slate-500">{formatFileSize(doc.file_size)}</span>
                              <span className="text-xs text-slate-500">
                                {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAnalyze(doc.id)}
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          >
                            <Brain className="h-4 w-4 mr-1" />
                            Analyze
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => window.open(doc.file_url, "_blank")}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analysis Results Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>AI Analysis Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyses.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No analysis results yet</p>
                  <p className="text-sm text-slate-500">Click "Analyze" on any document to get AI insights</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="border border-slate-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(analysis.status)}>
                            {analysis.status}
                          </Badge>
                          <Badge variant="outline">{analysis.analysis_type}</Badge>
                          {analysis.results?.provider && (
                            <Badge variant="secondary" className="text-xs">
                              {analysis.results.provider}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-slate-500 block">
                            {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                          </span>
                          {analysis.results?.tokens_used && (
                            <span className="text-xs text-slate-400 block">
                              {analysis.results.tokens_used} tokens
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {analysis.status === 'completed' && analysis.results?.analysis && (
                        <div className="bg-slate-50 p-3 rounded border">
                          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                            {analysis.results.analysis}
                          </pre>
                        </div>
                      )}
                      
                      {analysis.status === 'processing' && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>Processing analysis...</span>
                        </div>
                      )}
                      
                      {analysis.status === 'failed' && (
                        <div className="text-red-600 text-sm">
                          Analysis failed. Please try again.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
