"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Trash2, BarChart3, Brain, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { extractTextFromDocument, truncateText } from "@/lib/document-extractor"
// Usage tracking is handled server-side in API routes
import { UsageDisplay } from "@/components/usage-display"

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


  const [streamingAnalyses, setStreamingAnalyses] = useState<Map<string, string>>(new Map())
  const [extractedTexts, setExtractedTexts] = useState<Map<string, { text: string; wordCount: number; success: boolean }>>(new Map())
  const [savedExtractions, setSavedExtractions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'analyses' | 'extractions'>('analyses')
  const [refreshingAnalyses, setRefreshingAnalyses] = useState<Set<string>>(new Set())

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
      fetchSavedExtractions()
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
          
          // Check if we're currently refreshing analyses for this document
          const documentId = (payload.new as any)?.document_id || (payload.old as any)?.document_id
          if (documentId && refreshingAnalyses.has(documentId)) {
            console.log('🔄 Skipping real-time refresh for document', documentId, '- manual refresh in progress')
            return
          }
          
          // Add a small delay to ensure database transaction is committed
          console.log('🔄 Real-time subscription detected change, waiting before refresh...')
          setTimeout(() => {
            console.log('🔄 Real-time subscription triggering analyses refresh...')
            fetchAnalyses() // Refresh analyses when changes occur
          }, 1000) // Wait 1 second for transaction to commit
        }
      )
      .subscribe()

    // Subscribe to text_extractions table changes (with error handling)
    let extractionsSubscription: any = null
    try {
      extractionsSubscription = supabase
        .channel('extractions-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'text_extractions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Text extractions real-time change:', payload)
            console.log('🔄 Real-time subscription triggered, refreshing extractions...')
            console.log('📊 Payload details:', {
              event: payload.eventType,
              table: payload.table,
              record: payload.new || payload.old,
              user_id: (payload.new as any)?.user_id || (payload.old as any)?.user_id
            })
            fetchSavedExtractions() // Refresh extractions when changes occur
          }
        )
        .subscribe((status) => {
          console.log('🔄 Text extractions subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Text extractions real-time subscription active')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Text extractions subscription error - table may not exist yet')
          }
        })
    } catch (error) {
      console.warn('⚠️ Could not subscribe to text_extractions table:', error)
      console.log('This is normal if the table does not exist yet')
    }

    // Cleanup subscriptions
    return () => {
      console.log('Cleaning up real-time subscriptions')
      documentsSubscription.unsubscribe()
      analysesSubscription.unsubscribe()
      if (extractionsSubscription) {
        extractionsSubscription.unsubscribe()
      }
    }
  }, [user?.id, refreshingAnalyses])

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
        console.log('📊 Total analyses count:', analyses?.length || 0)
        if (analyses && analyses.length > 0) {
          console.log('📄 Latest analysis:', {
            id: analyses[0].id,
            document_id: analyses[0].document_id,
            status: analyses[0].status,
            created_at: analyses[0].created_at,
            results: analyses[0].results ? 'Has results' : 'No results'
          })
        }
        setAnalyses(analyses || [])
      }
    } catch (error) {
      console.error("Error fetching analyses:", error)
      setAnalyses([])
    }
  }

  const fetchSavedExtractions = async () => {
    try {
      console.log('Fetching saved text extractions...')
      
      // Check if user ID is available
      if (!user?.id) {
        console.log('User ID not available yet, skipping extractions fetch')
        return
      }
      
      const { data, error } = await supabase
        .from('text_extractions')
        .select(`
          *,
          documents (
            filename,
            file_type
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching saved extractions:', error)
        setSavedExtractions([])
      } else {
        console.log('Saved extractions fetched:', data)
        console.log('📊 Extractions count:', data?.length || 0)
        if (data && data.length > 0) {
          console.log('📄 Latest extraction:', {
            id: data[0].id,
            document_id: data[0].document_id,
            word_count: data[0].word_count,
            created_at: data[0].created_at
          })
        }
        setSavedExtractions(data || [])
      }
    } catch (error) {
      console.error('Error in fetchSavedExtractions:', error)
      setSavedExtractions([])
    }
  }

  const handleUploadComplete = (file: any) => {
    fetchDocuments() // Refresh the list
    // Refresh usage data to show updated counts
    if ((window as any).refreshUsageData) {
      (window as any).refreshUsageData()
    }
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
    
    console.log('🔍 getCurrentDocumentAnalyses debug:', {
      currentDocId: currentDoc.id,
      currentDocFilename: currentDoc.filename,
      totalAnalyses: analyses.length,
      allAnalyses: analyses.map(a => ({ id: a.id, document_id: a.document_id, status: a.status, created_at: a.created_at }))
    })
    
    const filteredAnalyses = analyses.filter(analysis => analysis.document_id === currentDoc.id)
    console.log('🔍 Filtered analyses for current document:', filteredAnalyses.length, filteredAnalyses)
    
    return filteredAnalyses
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
      
      // Verify the analysis record is visible by fetching it back
      const { data: verifyAnalysis, error: verifyError } = await supabase
        .from('analyses')
        .select('id, status, document_id, user_id')
        .eq('id', analysis.id)
        .single()
      
      if (verifyError || !verifyAnalysis) {
        console.error('❌ Analysis record not visible after creation:', verifyError)
        throw new Error('Analysis record not visible after creation - RLS policy issue')
      }
      
      console.log('✅ Analysis record verified as visible:', verifyAnalysis)
      
      // Small delay to ensure database transaction is fully committed
      console.log('⏳ Waiting for database transaction to commit...')
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('✅ Database transaction should be committed')

      // Get the actual file content from Supabase storage
      if (!document.storage_path) {
        throw new Error('Document has no storage path')
      }
      
      // Extract the file path from the storage URL
      let filePath = document.storage_path
      if (filePath.includes('/storage/v1/object/public/documents/')) {
        // Extract the path after 'documents/'
        filePath = filePath.split('/storage/v1/object/public/documents/')[1]
      }
      
      console.log('📥 Fetching file content from storage...')
      console.log('📁 Original storage_path:', document.storage_path)
      console.log('📁 Extracted filePath:', filePath)
      
      const { data: fileBlob, error: fileError } = await supabase.storage
        .from('documents')
        .download(filePath)
      
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
      
      // Check if we have stored extracted text first
      let documentContent = ''
      const storedExtraction = extractedTexts.get(documentId)
      if (storedExtraction && storedExtraction.success) {
        console.log('✅ Using stored extracted text for analysis:', documentId)
        documentContent = storedExtraction.text
        console.log(`Using stored text: ${storedExtraction.wordCount} words`)
      } else {
        console.log('No stored text found, will use server-side extraction')
        documentContent = '' // Will be filled by server-side extraction
      }
      
      // Create documentData object as expected by the API
      const documentData = {
        id: document.id,
        original_filename: document.filename || 'document',
        file_type: document.file_type || 'application/octet-stream',
        file_size: document.file_size,
        analysisId: analysis.id,
        documentContent: documentContent
      }
      
      console.log('🔍 Document data being sent:', {
        documentId,
        analysisId: analysis.id,
        documentDataKeys: Object.keys(documentData),
        documentDataString: JSON.stringify(documentData)
      })
      
      // Debug popup to show what's being sent to LLM
      const debugMessage = `
🔍 DEBUG: What's being sent to LLM:
=====================================
Document ID: ${documentId}
Analysis ID: ${analysis.id}
Document Content Length: ${documentData.documentContent.length} characters
Document Content Preview: ${documentData.documentContent.substring(0, 200)}...

Full Document Data Keys: ${Object.keys(documentData).join(', ')}

This should show the actual NDA text being sent to the AI.
      `.trim()
      
      alert(debugMessage)
      
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
                
                // Set refreshing flag to prevent real-time subscription interference
                setRefreshingAnalyses(prev => new Set(prev).add(documentId))
                
                // Temporarily disable real-time subscriptions to prevent interference
                console.log('🔄 Temporarily disabling real-time subscriptions...')
                
                // Update the analysis record to completed immediately
                console.log('🔄 Updating analysis record to completed...')
                console.log('🔍 Document ID:', documentId)
                console.log('🔍 Full response length:', fullResponse.length)
                
                try {
                  // Find the analysis record for this document
                  const currentAnalyses = await getCurrentDocumentAnalyses()
                  console.log('🔍 Current analyses found:', currentAnalyses.length)
                  console.log('🔍 Current analyses:', currentAnalyses.map(a => ({ id: a.id, document_id: a.document_id, status: a.status })))
                  
                  const existingAnalysis = currentAnalyses.find(a => a.document_id === documentId && a.status === 'processing')
                  console.log('🔍 Existing processing analysis:', existingAnalysis ? { id: existingAnalysis.id, status: existingAnalysis.status } : 'None found')
                  
                  if (existingAnalysis) {
                    console.log('🔄 Found processing analysis, updating to completed...')
                    console.log('🔍 Updating analysis ID:', existingAnalysis.id)
                    
                    const { error: updateError } = await supabase
                      .from('analyses')
                      .update({
                        status: 'completed',
                        results: {
                          analysis: fullResponse,
                          model: 'gpt-5-nano',
                          provider: 'Vercel AI Gateway'
                        },
                        completed_at: new Date().toISOString()
                      })
                      .eq('id', existingAnalysis.id)
                    
                                      if (updateError) {
                    console.error('❌ Failed to update analysis record:', updateError)
                    console.error('🔍 Update error details:', updateError)
                    throw new Error(`Failed to update analysis: ${updateError.message}`)
                  } else {
                    console.log('✅ Analysis record updated to completed successfully')
                  }
                  } else {
                    console.log('🔄 No processing analysis found, creating completed record...')
                    console.log('🔍 Creating new analysis for document:', documentId)
                    
                    const { error: createError } = await supabase
                      .from('analyses')
                      .insert({
                        document_id: documentId,
                        user_id: user.id,
                        analysis_type: 'contract_review',
                        status: 'completed',
                        results: {
                          analysis: fullResponse,
                          model: 'gpt-5-nano',
                          provider: 'Vercel AI Gateway'
                        },
                        completed_at: new Date().toISOString()
                      })
                    
                    if (createError) {
                      console.error('❌ Failed to create analysis record:', createError)
                      console.error('🔍 Create error details:', createError)
                      throw new Error(`Failed to create analysis: ${createError.message}`)
                    } else {
                      console.log('✅ Analysis record created successfully')
                    }
                  }
                  
                  // Wait a moment for the database transaction to commit
                  console.log('🔄 Waiting for database transaction to commit...')
                  await new Promise(resolve => setTimeout(resolve, 500))
                  
                  // Refresh analyses to show the updated record
                  console.log('🔄 Refreshing analyses from database...')
                  await fetchAnalyses()
                  console.log('✅ Analyses refreshed from database')
                  
                  // Force update local state to show completed analysis immediately
                  console.log('🔄 Force updating local analyses state...')
                  setAnalyses(prevAnalyses => {
                    const updatedAnalyses = prevAnalyses.map(analysis => {
                      if (analysis.document_id === documentId && analysis.status === 'processing') {
                        console.log('🔄 Updating local analysis state from processing to completed')
                        return {
                          ...analysis,
                          status: 'completed',
                          results: {
                            analysis: fullResponse,
                            model: 'gpt-5-nano',
                            provider: 'Vercel AI Gateway'
                          },
                          completed_at: new Date().toISOString()
                        }
                      }
                      return analysis
                    })
                    console.log('🔄 Local analyses state updated, count:', updatedAnalyses.length)
                    return updatedAnalyses
                  })
                  
                  // Double-check that the analysis is now completed with retry logic
                  console.log('🔍 Verifying analysis completion in database...')
                  let completedAnalysis = null
                  let retryCount = 0
                  const maxRetries = 3
                  
                  while (!completedAnalysis && retryCount < maxRetries) {
                    console.log(`🔍 Verification attempt ${retryCount + 1}/${maxRetries}`)
                    const updatedAnalyses = await getCurrentDocumentAnalyses()
                    completedAnalysis = updatedAnalyses.find(a => a.document_id === documentId && a.status === 'completed')
                    
                    if (completedAnalysis) {
                      console.log('✅ Analysis verified as completed in database')
                      break
                    }
                    
                    retryCount++
                    if (retryCount < maxRetries) {
                      console.log(`🔄 Retry ${retryCount}/${maxRetries} - waiting 500ms...`)
                      await new Promise(resolve => setTimeout(resolve, 500))
                    }
                  }
                  
                  if (completedAnalysis) {
                    console.log('🔍 Completed analysis details:', { id: completedAnalysis.id, status: completedAnalysis.status })
                  } else {
                    console.warn('⚠️ Analysis completion verification failed after all retries')
                  }
                  
                } catch (error) {
                  console.error('❌ Error updating analysis record:', error)
                  console.error('🔍 Full error details:', error)
                } finally {
                  // Clear refreshing flag
                  setRefreshingAnalyses(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(documentId)
                    return newSet
                  })
                }
                
                // Show a success message to the user
                console.log('🎉 Analysis completed! Analysis record updated in database.')
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
        
        // Update usage tracking to reflect the deleted document
        try {
          // Get current document count and storage usage
          const { data: currentUsage, error: usageFetchError } = await supabase
            .from('documents')
            .select('file_size')
            .eq('user_id', user.id)
          
          if (!usageFetchError && currentUsage) {
            const documentCount = currentUsage.length
            const storageUsed = currentUsage.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
            
            // Update usage tracking
            const { error: usageUpdateError } = await supabase
              .from('usage_tracking')
              .update({
                documents_uploaded: documentCount,
                storage_used_bytes: storageUsed,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('month_year', new Date().toISOString().slice(0, 7))
            
            if (usageUpdateError) {
              console.log('Usage tracking update failed, will refresh via UI:', usageUpdateError)
            } else {
              console.log('Usage tracking updated successfully:', { documentCount, storageUsed })
            }
          }
        } catch (usageUpdateError) {
          console.log('Usage tracking update error:', usageUpdateError)
        }
        
        // Refresh usage data to update the progress bar
        if ((window as any).refreshUsageData) {
          (window as any).refreshUsageData()
        }
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
                cause: (fetchError as any).cause
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
          
          // Check if we have stored extracted text first
          const storedExtraction = extractedTexts.get(documentId)
          if (storedExtraction && storedExtraction.success) {
            console.log('✅ Using stored extracted text for analysis:', documentId)
            documentText = storedExtraction.text
            documentContent = truncateText(storedExtraction.text, 8000)
            console.log(`Using stored text: ${storedExtraction.wordCount} words`)
          }
          
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
                
                console.log('FormData created with entries:', Array.from(formData.entries()))
                
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

  const handleConvertToText = async (documentId: string) => {
    try {
      console.log('Starting PDF text extraction for:', documentId)
      
      // Find the document in our local state
      const document = documents.find(doc => doc.id === documentId)
      if (!document) {
        alert('Document not found')
        return
      }

      console.log('Document found:', document)

      // Check if user ID is available
      if (!user?.id) {
        alert('User not authenticated')
        return
      }

      // Download the file from Supabase storage
      if (!document.storage_path) {
        alert('Document storage path not found')
        return
      }
      
      // Extract the file path from the storage URL
      let filePath = document.storage_path
      if (filePath.includes('/storage/v1/object/public/documents/')) {
        // Extract the path after 'documents/'
        filePath = filePath.split('/storage/v1/object/public/documents/')[1]
      }
      
      console.log('Downloading file from storage path:', filePath)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath)

      if (downloadError) {
        console.error('Download error:', downloadError)
        alert(`Failed to download file: ${downloadError.message}`)
        return
      }

      if (!fileData) {
        alert('No file data received')
        return
      }

      console.log('File downloaded successfully, size:', fileData.size)

      // Convert to File object for the extractor
      const file = new File([fileData], document.filename, { 
        type: document.file_type || 'application/octet-stream' 
      })

      console.log('File object created:', file.name, file.size, file.type)

      // Extract text using the existing function
      console.log('Starting text extraction...')
      const extractionResult = await extractTextFromDocument(file)
      console.log('Text extraction completed:', extractionResult)

      // Store the extracted text for later use by the analyze function
      if (extractionResult.success && extractionResult.text) {
        setExtractedTexts(prev => new Map(prev).set(documentId, {
          text: extractionResult.text,
          wordCount: extractionResult.wordCount,
          success: true
        }))
        console.log('Extracted text stored for document:', documentId)
        
        // Call the text extraction API to track usage
        try {
          const response = await fetch('/api/text-extraction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              documentId: documentId,
              extractedText: extractionResult.text,
              wordCount: extractionResult.wordCount
            })
          })

          if (response.ok) {
            console.log('✅ Text extraction usage tracked successfully')
            // Refresh usage data to show updated counts
            if ((window as any).refreshUsageData) {
              (window as any).refreshUsageData()
            }
            // Refresh saved extractions to show the new extraction in the UI
            console.log('🔄 Refreshing saved extractions to show new extraction...')
            // Add a small delay to ensure the database update is complete
            await new Promise(resolve => setTimeout(resolve, 1000))
            await fetchSavedExtractions()
            console.log('✅ Saved extractions refreshed')
            
            // Also force a re-render by updating state
            setSavedExtractions(prev => [...prev])
            
            // Show success message to user
            console.log('🎉 Text extraction completed and saved! Check the "Saved Text Extractions" section below.')
          } else {
            const errorData = await response.json()
            console.log('⚠️ Text extraction usage tracking failed:', errorData)
          }
        } catch (apiError) {
          console.log('⚠️ Error calling text extraction API:', apiError)
        }
      }

      // Create detailed debug information
      const debugInfo = {
        documentId,
        filename: document.filename,
        fileSize: document.file_size,
        fileType: document.file_type,
        storagePath: document.storage_path,
        extractionSuccess: extractionResult.success,
        extractedText: extractionResult.text,
        wordCount: extractionResult.wordCount,
        error: extractionResult.error,
        timestamp: new Date().toISOString()
      }

      // Display results in a detailed alert (for now)
      const message = `
Text Extraction Results:
=======================
Document: ${document.filename}
File Size: ${document.file_size} bytes
File Type: ${document.file_type}
Storage Path: ${document.storage_path || 'N/A'}

Extraction Status: ${extractionResult.success ? 'SUCCESS' : 'FAILED'}
${extractionResult.error ? `Error: ${extractionResult.error}` : ''}

Extracted Text (${extractionResult.wordCount} words):
${extractionResult.text ? extractionResult.text.substring(0, 500) + (extractionResult.text.length > 500 ? '...' : '') : 'No text extracted'}

Full text length: ${extractionResult.text?.length || 0} characters
      `.trim()

      alert(message)

      // Also log to console for debugging
      console.log('Text extraction debug info:', debugInfo)

    } catch (error) {
      console.error('Error in handleConvertToText:', error)
      alert(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  console.log('Testing upload API...')
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) {
                    alert('No session found')
                    return
                  }
                  
                  const response = await fetch('/api/test-upload', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`
                    }
                  })
                  
                  const result = await response.json()
                  console.log('Test upload result:', result)
                  alert(`Test result: ${response.ok ? 'SUCCESS' : 'FAILED'}\n${JSON.stringify(result, null, 2)}`)
                } catch (error) {
                  console.error('Test upload error:', error)
                  alert(`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
              }}
            >
              Test Upload API
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  console.log('Resetting usage counts...')
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) {
                    alert('No session found')
                    return
                  }
                  
                  // Reset usage tracking to 0 for current month
                  const { error: resetError } = await supabase
                    .from('usage_tracking')
                    .update({
                      text_extractions: 0,
                      analyses_performed: 0,
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)
                    .eq('month_year', new Date().toISOString().slice(0, 7)) // Current month (YYYY-MM)
                  
                  if (resetError) {
                    console.error('Error resetting usage:', resetError)
                    alert(`Failed to reset usage: ${resetError.message}`)
                  } else {
                    console.log('✅ Usage counts reset successfully')
                    alert('✅ Usage counts reset successfully!\n\nText Extractions: 0\nAI Analyses: 0\n\nYou can now continue using these features.')
                    
                    // Refresh usage data to show updated counts
                    if ((window as any).refreshUsageData) {
                      (window as any).refreshUsageData()
                    }
                  }
                } catch (error) {
                  console.error('Reset usage error:', error)
                  alert(`Reset error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              🔄 Reset Usage Counts
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  console.log('Resetting all usage counts...')
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) {
                    alert('No session found')
                    return
                  }
                  
                  // Reset ALL usage tracking to 0 for current month
                  const { error: resetError } = await supabase
                    .from('usage_tracking')
                    .update({
                      documents_uploaded: 0,
                      storage_used_bytes: 0,
                      text_extractions: 0,
                      analyses_performed: 0,
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)
                    .eq('month_year', new Date().toISOString().slice(0, 7)) // Current month (YYYY-MM)
                  
                  if (resetError) {
                    console.error('Error resetting all usage:', resetError)
                    alert(`Failed to reset all usage: ${resetError.message}`)
                  } else {
                    console.log('✅ All usage counts reset successfully')
                    alert('✅ All usage counts reset successfully!\n\nDocuments Uploaded: 0\nStorage Used: 0 bytes\nText Extractions: 0\nAI Analyses: 0\n\nYou can now continue using all features.')
                    
                    // Refresh usage data to show updated counts
                    if ((window as any).refreshUsageData) {
                      (window as any).refreshUsageData()
                    }
                  }
                } catch (error) {
                  console.error('Reset all usage error:', error)
                  alert(`Reset error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              🗑️ Reset All Usage
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  console.log('Resetting all data...')
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) {
                    alert('No session found')
                    return
                  }
                  
                  // Confirm the action
                  const confirmed = confirm('⚠️ WARNING: This will delete ALL your text extractions and AI analyses!\n\nThis action cannot be undone.\n\nAre you sure you want to continue?')
                  if (!confirmed) {
                    console.log('Reset cancelled by user')
                    return
                  }
                  
                  console.log('User confirmed reset, proceeding...')
                  
                  // Delete all text extractions for the user
                  const { error: extractionsError } = await supabase
                    .from('text_extractions')
                    .delete()
                    .eq('user_id', user.id)
                  
                  if (extractionsError) {
                    console.error('Error deleting text extractions:', extractionsError)
                    alert(`Failed to delete text extractions: ${extractionsError.message}`)
                    return
                  }
                  
                  // Delete all analyses for the user
                  const { error: analysesError } = await supabase
                    .from('analyses')
                    .delete()
                    .eq('user_id', user.id)
                  
                  if (analysesError) {
                    console.error('Error deleting analyses:', analysesError)
                    alert(`Failed to delete analyses: ${analysesError.message}`)
                    return
                  }
                  
                  // Reset usage tracking to 0
                  const { error: usageError } = await supabase
                    .from('usage_tracking')
                    .update({
                      documents_uploaded: 0,
                      storage_used_bytes: 0,
                      text_extractions: 0,
                      analyses_performed: 0,
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)
                    .eq('month_year', new Date().toISOString().slice(0, 7))
                  
                  if (usageError) {
                    console.error('Error resetting usage:', usageError)
                    alert(`Failed to reset usage: ${usageError.message}`)
                    return
                  }
                  
                  console.log('✅ All data reset successfully')
                  alert('✅ All data reset successfully!\n\nDeleted:\n- All text extractions\n- All AI analyses\n- Reset usage counts to 0\n\nYou can now start fresh!')
                  
                  // Refresh all data
                  await fetchSavedExtractions()
                  await fetchAnalyses()
                  if ((window as any).refreshUsageData) {
                    (window as any).refreshUsageData()
                  }
                } catch (error) {
                  console.error('Reset all data error:', error)
                  alert(`Reset error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              💥 Reset All Data
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  console.log('Resetting current month usage...')
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) {
                    alert('No session found')
                    return
                  }
                  
                  // Get current month
                  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
                  console.log('Resetting usage for month:', currentMonth)
                  
                  // Check if usage tracking record exists for current month
                  const { data: existingUsage, error: checkError } = await supabase
                    .from('usage_tracking')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('month_year', currentMonth)
                    .single()
                  
                  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error('Error checking existing usage:', checkError)
                    alert(`Failed to check existing usage: ${checkError.message}`)
                    return
                  }
                  
                  if (existingUsage) {
                    // Update existing record
                    const { error: updateError } = await supabase
                      .from('usage_tracking')
                      .update({
                        text_extractions: 0,
                        analyses_performed: 0,
                        updated_at: new Date().toISOString()
                      })
                      .eq('user_id', user.id)
                      .eq('month_year', currentMonth)
                    
                    if (updateError) {
                      console.error('Error updating usage:', updateError)
                      alert(`Failed to update usage: ${updateError.message}`)
                      return
                    }
                  } else {
                    // Create new record for current month
                    const { error: insertError } = await supabase
                      .from('usage_tracking')
                      .insert({
                        user_id: user.id,
                        month_year: currentMonth,
                        documents_uploaded: 0,
                        storage_used_bytes: 0,
                        text_extractions: 0,
                        analyses_performed: 0
                      })
                    
                    if (insertError) {
                      console.error('Error creating usage record:', insertError)
                      alert(`Failed to create usage record: ${insertError.message}`)
                      return
                    }
                  }
                  
                  console.log('✅ Current month usage reset successfully')
                  alert('✅ Current month usage reset successfully!\n\nMonth: ' + currentMonth + '\nText Extractions: 0\nAI Analyses: 0\n\nYou can now continue using these features.')
                  
                  // Refresh usage data to show updated counts
                  if ((window as any).refreshUsageData) {
                    (window as any).refreshUsageData()
                  }
                } catch (error) {
                  console.error('Reset current month usage error:', error)
                  alert(`Reset error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
              }}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              📅 Reset Current Month
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Usage Display */}
        {user?.id && (
          <div className="mb-8">
            <UsageDisplay userId={user.id} />
          </div>
        )}
        
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
                                onClick={() => handleConvertToText(currentDoc.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Convert to Text
                              </Button>
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

                {/* Tabbed Interface for Analyses and Extractions */}
                {(() => {
                  const currentDoc = getCurrentDocument()
                  if (!currentDoc) return null
                  
                  const currentAnalyses = getCurrentDocumentAnalyses()
                  const currentDocumentExtractions = savedExtractions.filter(
                    extraction => extraction.document_id === currentDoc.id
                  )
                  
                  // Only show tabs if there are analyses or extractions
                  if (currentAnalyses.length === 0 && currentDocumentExtractions.length === 0) return null
                  
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <span>Document Results for "{currentDoc.filename}"</span>
                        </CardTitle>
                        
                        {/* Tab Navigation */}
                        <div className="flex space-x-1 mt-4">
                          <Button
                            variant={activeTab === 'analyses' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab('analyses')}
                            className="flex items-center space-x-2"
                          >
                            <Brain className="h-4 w-4" />
                            <span>AI Analyses</span>
                            {currentAnalyses.length > 0 && (
                              <Badge variant="secondary" className="ml-1">
                                {currentAnalyses.length}
                              </Badge>
                            )}
                          </Button>
                          
                          <Button
                            variant={activeTab === 'extractions' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab('extractions')}
                            className="flex items-center space-x-2"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Text Extractions</span>
                            {currentDocumentExtractions.length > 0 && (
                              <Badge variant="secondary" className="ml-1">
                                {currentDocumentExtractions.length}
                              </Badge>
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        {/* Analyses Tab */}
                        {activeTab === 'analyses' && (
                          <div className="space-y-4">
                            {currentAnalyses.length === 0 ? (
                              <div className="text-center py-8 text-slate-500">
                                <Brain className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p>No AI analyses yet for this document</p>
                                <p className="text-sm">Click "Analyze with AI" to get started</p>
                              </div>
                            ) : (
                              <>
                                {/* Show latest analysis by default */}
                                {(() => {
                                  const latestAnalysis = getLatestAnalysis(currentAnalyses)
                                  if (!latestAnalysis) return null
                                  
                                  return (
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
                                  )
                                })()}

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
                                        .filter(analysis => analysis.id !== getLatestAnalysis(currentAnalyses)?.id)
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
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Extractions Tab */}
                        {activeTab === 'extractions' && (
                          <div className="space-y-4">
                            {currentDocumentExtractions.length === 0 ? (
                              <div className="text-center py-8 text-slate-500">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p>No text extractions yet for this document</p>
                                <p className="text-sm">Click "Convert to Text" to get started</p>
                              </div>
                              ) : (
                              <>
                                {currentDocumentExtractions.map((extraction) => (
                                  <div key={extraction.id} className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <Badge variant="outline">
                                          {extraction.word_count} words
                                        </Badge>
                                        <span className="text-sm text-slate-500">
                                          {formatDistanceToNow(new Date(extraction.created_at), { addSuffix: true })}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Display extracted text with proper formatting */}
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed bg-slate-50 p-3 rounded border max-h-64 overflow-y-auto">
                                      {extraction.extracted_text}
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
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

