import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import mammoth from "mammoth"

export async function POST(request: NextRequest) {
  try {
    console.log('=== ANALYZE API CALLED ===')
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    // Check if this is a FormData request (file upload) or JSON request
    const contentType = request.headers.get('content-type') || ''
    console.log('Content-Type header:', contentType)
    
    let documentId: string
    let analysisType: string
    let userId: string
    let documentData: any
    let file: File | null = null
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData request with file
      console.log('✅ Processing FormData request with file')
      const formData = await request.formData()
      
      // Log all form data keys
      console.log('FormData keys found:', Array.from(formData.keys()))
      
      file = formData.get('file') as File
      documentId = formData.get('documentId') as string
      analysisType = formData.get('analysisType') as string
      userId = formData.get('userId') as string
      const documentDataString = formData.get('documentData') as string
      
      console.log('FormData values:', {
        hasFile: !!file,
        fileType: file?.type,
        fileSize: file?.size,
        fileName: file?.name,
        documentId,
        analysisType,
        userId,
        documentDataStringLength: documentDataString?.length
      })
      
      try {
        documentData = JSON.parse(documentDataString)
        console.log('✅ Document data parsed successfully')
      } catch (parseError) {
        console.error('❌ Failed to parse documentData JSON:', parseError)
        console.log('Raw documentData string:', documentDataString)
        return NextResponse.json({ error: "Invalid document data format" }, { status: 400 })
      }
    } else {
      // Handle JSON request (existing behavior)
      console.log('📄 Processing JSON request')
      const body = await request.json()
      documentId = body.documentId
      analysisType = body.analysisType
      userId = body.userId
      documentData = body.documentData
    }
    
    if (!documentId || !analysisType || !userId || !documentData) {
      return NextResponse.json(
        { error: "Document ID, analysis type, user ID, and document data are required" },
        { status: 400 }
      )
    }
    
    // Create Supabase server client
    const supabase = await createClient()
    
    console.log('Using document data:', { 
      documentId, 
      userId, 
      filename: documentData.original_filename,
      hasText: !!documentData.documentContent,
      textLength: documentData.documentContent?.length || 0,
      hasFile: !!file
    })
    
    // Use the document data passed from client instead of database lookup
    const document = documentData
    
    // Analysis record is already created on client-side, we just need the ID
    const analysisId = documentData.analysisId || 'temp-id'
    
    console.log('Using existing analysis record:', analysisId)
    
    // If we have a file, extract text from it server-side
    let extractedText = document.documentContent || ''
    console.log('File processing check:', { hasFile: !!file, fileType: file?.type, fileSize: file?.size })
    
    if (file) {
      console.log('🎯 Extracting text from uploaded file server-side...')
      console.log('File details:', { name: file.name, type: file.type, size: file.size })
      
      try {
        // For now, we'll use a simple approach - convert to text if possible
        // In production, you'd want to use proper libraries like mammoth for DOCX
        if (file.type.includes('text/')) {
          extractedText = await file.text()
          console.log('Text extracted from file, length:', extractedText.length)
        } else if (file.type.includes('docx') || file.type.includes('word')) {
          // Use Mammoth for proper DOCX text extraction
          console.log('🎯 Using Mammoth for DOCX text extraction...')
          
          try {
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            
            console.log('Processing DOCX with Mammoth...')
            const result = await mammoth.extractRawText({ buffer })
            
            if (result.value) {
              extractedText = result.value
              console.log('✅ Mammoth text extraction successful, length:', extractedText.length)
              console.log('Text preview:', extractedText.substring(0, 200) + '...')
            } else {
              console.warn('Mammoth extraction returned no text')
              extractedText = `DOCX file processed: ${file.name} (${file.size} bytes)
              
Mammoth extraction completed but no text content was found. This may indicate an empty or corrupted document.

File details:
- Name: ${file.name}
- Type: ${file.type}
- Size: ${file.size} bytes
- Status: Processed with Mammoth, no content found`
            }
            
            // Log any warnings from Mammoth
            if (result.messages && result.messages.length > 0) {
              console.log('Mammoth warnings:', result.messages)
            }
            
          } catch (mammothError) {
            console.error('❌ Mammoth DOCX processing failed:', mammothError)
            extractedText = `DOCX file received: ${file.name} (${file.size} bytes)
            
The file has been uploaded successfully, but Mammoth text extraction encountered an error: ${mammothError instanceof Error ? mammothError.message : 'Unknown error'}

File details:
- Name: ${file.name}
- Type: ${file.type}
- Size: ${file.size} bytes
- Status: Uploaded successfully, Mammoth extraction failed

Note: This may indicate a corrupted or unsupported DOCX format.`
          }
        } else {
          extractedText = `File received: ${file.name} (${file.type}, ${file.size} bytes)
          
The file has been uploaded successfully and is ready for analysis.`
        }
      } catch (extractionError) {
        console.error('Text extraction failed:', extractionError)
        extractedText = `File processing error: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`
      }
    }
    
    // Call Vercel AI Gateway server-side
    console.log('Calling Vercel AI Gateway from server...')
    console.log('API Key available:', !!process.env.AI_GATEWAY_API_KEY)
    console.log('Content being sent to LLM:', {
      hasFile: !!file,
      extractedTextLength: extractedText.length,
      extractedTextPreview: extractedText.substring(0, 200) + '...',
      fullExtractedText: extractedText
    })
    
    // Log the actual prompt being sent
    const userPrompt = `Please analyze this legal document: ${document.original_filename} (${document.file_type}, ${document.file_size} bytes).

DOCUMENT CONTENT:
${extractedText || 'No document content available for analysis.'}

Please provide a comprehensive legal analysis of the ACTUAL CONTENT of this document, not general advice. Focus on:

1. **Key Terms & Conditions**: Identify and explain the specific contractual terms found in this document
2. **Potential Risks & Red Flags**: Highlight concerning clauses, unusual terms, or potential legal issues specific to this contract
3. **Compliance Considerations**: Note any regulatory or compliance requirements mentioned in this document
4. **Recommendations**: Provide actionable advice for improvement or negotiation based on the actual content
5. **Summary**: Brief overview of this specific document's purpose and key obligations

Be specific to the content provided and give practical legal insights based on what's actually in this document.`
    
    console.log('Full user prompt being sent to LLM:', userPrompt)
    
    // Check if client wants streaming
    const wantsStreaming = request.headers.get('accept')?.includes('text/event-stream')
    
    console.log('🎯 Streaming check:', {
      acceptHeader: request.headers.get('accept'),
      wantsStreaming,
      contentType: request.headers.get('content-type')
    })
    
    if (wantsStreaming) {
      console.log('🚀 Starting streaming response...')
      // Return streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log('🔄 Creating streaming response...')
            
            // First, send a test message to verify streaming works
            controller.enqueue(`data: ${JSON.stringify({ content: "Starting AI analysis...\n\n" })}\n\n`)
            
            const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'openai/gpt-5-nano',
                messages: [
                  {
                    role: 'system',
                    content: `You are a legal AI assistant specializing in contract analysis and legal document review. 
                    
Your task is to analyze legal documents and provide professional insights on:

1. **Key Terms & Conditions**: Identify and explain the main contractual terms
2. **Potential Risks & Red Flags**: Highlight concerning clauses, unusual terms, or potential legal issues
3. **Compliance Considerations**: Note any regulatory or compliance requirements
4. **Recommendations**: Provide actionable advice for improvement or negotiation
5. **Summary**: Brief overview of the document's purpose and key obligations

Be professional, thorough, and provide practical legal insights. Use clear language and structure your response with headings.`
                  },
                  {
                    role: 'user',
                    content: userPrompt
                  }
                ],
                stream: true
              })
            })

            if (!response.ok) {
              const errorText = await response.text()
              controller.enqueue(`data: ${JSON.stringify({ error: "AI analysis failed: " + errorText })}\n\n`)
              controller.close()
              return
            }

            const reader = response.body?.getReader()
            if (!reader) {
              controller.enqueue(`data: ${JSON.stringify({ error: "No response body" })}\n\n`)
              controller.close()
              return
            }

            let fullResponse = ''
            
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split('\n')
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    // Analysis complete, update database
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
                      .eq('id', analysisId)

                    if (updateError) {
                      console.error('Failed to update analysis record:', updateError)
                    }

                    controller.enqueue(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`)
                    controller.close()
                    return
                  }

                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.choices?.[0]?.delta?.content) {
                      const content = parsed.choices[0].delta.content
                      fullResponse += content
                      controller.enqueue(`data: ${JSON.stringify({ content, partial: fullResponse })}\n\n`)
                    }
                  } catch (e) {
                    // Skip malformed JSON
                  }
                }
              }
            }
          } catch (error) {
            console.error('Streaming error:', error)
            controller.enqueue(`data: ${JSON.stringify({ error: "Streaming failed: " + error })}\n\n`)
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Non-streaming response (existing behavior)
      const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-nano',
          messages: [
            {
              role: 'system',
              content: `You are a legal AI assistant specializing in contract analysis and legal document review. 
              
Your task is to analyze legal documents and provide professional insights on:

1. **Key Terms & Conditions**: Identify and explain the main contractual terms
2. **Potential Risks & Red Flags**: Highlight concerning clauses, unusual terms, or potential legal issues
3. **Compliance Considerations**: Note any regulatory or compliance requirements
4. **Recommendations**: Provide actionable advice for improvement or negotiation
5. **Summary**: Brief overview of the document's purpose and key obligations

Be professional, thorough, and provide practical legal insights. Use clear language and structure your response with headings.`
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          stream: false
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Vercel AI Gateway error:', errorText)
        
        return NextResponse.json(
          { error: "AI analysis failed: " + errorText },
          { status: 500 }
        )
      }
      
      const data = await response.json()
      const analysisResult = data.choices[0]?.message?.content || 'Analysis failed - no content received'
      
      console.log('Vercel AI Gateway analysis completed successfully')
      console.log('Token usage:', data.usage?.total_tokens || 0)
      console.log('Model used:', data.model)
      
      // Return the analysis results for client-side update
      return NextResponse.json({
        success: true,
        analysis: {
          id: analysisId,
          status: 'completed',
          results: {
            analysis: analysisResult,
            model: data.model || 'gpt-5-nano',
            tokens_used: data.usage?.total_tokens || 0,
            provider: 'Vercel AI Gateway'
          }
        }
      })
    }
    
  } catch (error) {
    console.error('Analysis API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
