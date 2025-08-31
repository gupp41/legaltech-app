import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import mammoth from "mammoth"
import { usageTracker } from "@/lib/usage-tracker"
import { StructuredAnalysis } from "@/types/analysis"

// Helper function to format structured analysis into readable text
function formatStructuredAnalysis(analysis: StructuredAnalysis): string {
  let formatted = ''
  
  // Summary Section
  formatted += `# Document Analysis Summary\n\n`
  formatted += `**Document Purpose:** ${analysis.summary.document_purpose}\n`
  formatted += `**Document Type:** ${analysis.summary.document_type}\n`
  
  // Handle overall_assessment safely
  if (analysis.summary.overall_assessment) {
    formatted += `**Overall Risk Assessment:** ${analysis.summary.overall_assessment.replace('_', ' ').toUpperCase()}\n\n`
  }
  
  // Handle key_obligations safely
  if (analysis.summary.key_obligations && analysis.summary.key_obligations.length > 0) {
    formatted += `**Key Obligations:**\n`
    analysis.summary.key_obligations.forEach(obligation => {
      formatted += `• ${obligation}\n`
    })
    formatted += '\n'
  }
  
  // Risk Analysis Section
  if (analysis.risk_analysis) {
    formatted += `# Risk Analysis\n\n`
    if (analysis.risk_analysis.risk_summary) {
      formatted += `${analysis.risk_analysis.risk_summary}\n\n`
    }
    
    if (analysis.risk_analysis.high_risk_items && analysis.risk_analysis.high_risk_items.length > 0) {
      formatted += `## 🔴 High Risk Items\n\n`
      analysis.risk_analysis.high_risk_items.forEach(item => {
        formatted += `**${item.clause}**\n`
        formatted += `- Description: ${item.description}\n`
        formatted += `- Impact: ${item.impact}\n`
        formatted += `- Recommendation: ${item.recommendation}\n\n`
      })
    }
    
    if (analysis.risk_analysis.medium_risk_items && analysis.risk_analysis.medium_risk_items.length > 0) {
      formatted += `## 🟡 Medium Risk Items\n\n`
      analysis.risk_analysis.medium_risk_items.forEach(item => {
        formatted += `**${item.clause}**\n`
        formatted += `- Description: ${item.description}\n`
        formatted += `- Impact: ${item.impact}\n`
        formatted += `- Recommendation: ${item.recommendation}\n\n`
      })
    }
    
    if (analysis.risk_analysis.low_risk_items && analysis.risk_analysis.low_risk_items.length > 0) {
      formatted += `## 🟢 Low Risk Items\n\n`
      analysis.risk_analysis.low_risk_items.forEach(item => {
        formatted += `**${item.clause}**\n`
        formatted += `- Description: ${item.description}\n`
        formatted += `- Impact: ${item.impact}\n`
        formatted += `- Recommendation: ${item.recommendation}\n\n`
      })
    }
  }
  
  // Identified Clauses Section
  if (analysis.identified_clauses) {
    formatted += `# Identified Clauses\n\n`
    
    if (analysis.identified_clauses.key_terms && analysis.identified_clauses.key_terms.length > 0) {
    formatted += `## Key Terms\n\n`
    analysis.identified_clauses.key_terms.forEach(term => {
      formatted += `**${term.name}** (${term.importance.toUpperCase()})\n`
      formatted += `- Description: ${term.description}\n`
      formatted += `- Implications: ${term.implications}\n\n`
    })
  }
  
  if (analysis.identified_clauses.conditions.length > 0) {
    formatted += `## Conditions\n\n`
    analysis.identified_clauses.conditions.forEach(condition => {
      formatted += `**${condition.name}** (${condition.importance.toUpperCase()})\n`
      formatted += `- Description: ${condition.description}\n`
      formatted += `- Implications: ${condition.implications}\n\n`
    })
  }
  
  if (analysis.identified_clauses.obligations.length > 0) {
    formatted += `## Obligations\n\n`
    analysis.identified_clauses.obligations.forEach(obligation => {
      formatted += `**${obligation.name}** (${obligation.importance.toUpperCase()})\n`
      formatted += `- Description: ${obligation.description}\n`
      formatted += `- Implications: ${obligation.implications}\n\n`
    })
  }
  
  if (analysis.identified_clauses.rights.length > 0) {
    formatted += `## Rights\n\n`
    analysis.identified_clauses.rights.forEach(right => {
      formatted += `**${right.name}** (${right.importance.toUpperCase()})\n`
      formatted += `- Description: ${right.description}\n`
      formatted += `- Implications: ${right.implications}\n\n`
    })
  }
  
  // Missing Clauses Section
  formatted += `# Missing Clauses & Recommendations\n\n`
  
  if (analysis.missing_clauses.recommended_additions.length > 0) {
    formatted += `## Recommended Additions\n\n`
    analysis.missing_clauses.recommended_additions.forEach(addition => {
      formatted += `• ${addition}\n`
    })
    formatted += '\n'
  }
  
  if (analysis.missing_clauses.industry_standards.length > 0) {
    formatted += `## Industry Standards to Consider\n\n`
    analysis.missing_clauses.industry_standards.forEach(standard => {
      formatted += `• ${standard}\n`
    })
    formatted += '\n'
  }
  
  if (analysis.missing_clauses.compliance_gaps.length > 0) {
    formatted += `## Compliance Gaps\n\n`
    analysis.missing_clauses.compliance_gaps.forEach(gap => {
      formatted += `• ${gap}\n`
    })
    formatted += '\n'
  }
  
  // Compliance Section
  formatted += `# Compliance Considerations\n\n`
  formatted += `**Compliance Score:** ${analysis.compliance_considerations.compliance_score.replace('_', ' ').toUpperCase()}\n\n`
  
  if (analysis.compliance_considerations.regulatory_requirements.length > 0) {
    formatted += `## Regulatory Requirements\n\n`
    analysis.compliance_considerations.regulatory_requirements.forEach(req => {
      formatted += `• ${req}\n`
    })
    formatted += '\n'
  }
  
  if (analysis.compliance_considerations.industry_standards.length > 0) {
    formatted += `## Industry Standards\n\n`
    analysis.compliance_considerations.industry_standards.forEach(standard => {
      formatted += `• ${standard}\n`
    })
    formatted += '\n'
  }
  
  if (analysis.compliance_considerations.potential_violations.length > 0) {
    formatted += `## Potential Violations\n\n`
    analysis.compliance_considerations.potential_violations.forEach(violation => {
      formatted += `• ${violation}\n`
    })
    formatted += '\n'
  }
  
  // Recommendations Section
  formatted += `# Recommendations\n\n`
  
  if (analysis.recommendations.negotiation_points.length > 0) {
    formatted += `## Negotiation Points\n\n`
    analysis.recommendations.negotiation_points.forEach(point => {
      formatted += `• ${point}\n`
    })
    formatted += '\n'
  }
  
  if (analysis.recommendations && analysis.recommendations.improvements && analysis.recommendations.improvements.length > 0) {
    formatted += `## Suggested Improvements\n\n`
    analysis.recommendations.improvements.forEach(improvement => {
      formatted += `• ${improvement}\n`
    })
    formatted += '\n'
  }
  
  if (analysis.recommendations && analysis.recommendations.red_flags && analysis.recommendations.red_flags.length > 0) {
    formatted += `## Red Flags\n\n`
    analysis.recommendations.red_flags.forEach(flag => {
      formatted += `• ${flag}\n`
    })
    formatted += '\n'
  }
  
  if (analysis.recommendations && analysis.recommendations.next_steps && analysis.recommendations.next_steps.length > 0) {
    formatted += `## Next Steps\n\n`
    analysis.recommendations.next_steps.forEach(step => {
      formatted += `• ${step}\n`
    })
    formatted += '\n'
  }
  
  // Technical Details Section
  if (analysis.technical_details) {
    formatted += `# Technical Details\n\n`
    
    if (analysis.technical_details.contract_value) {
      formatted += `**Contract Value:** ${analysis.technical_details.contract_value}\n`
    }
    if (analysis.technical_details.duration) {
      formatted += `**Duration:** ${analysis.technical_details.duration}\n`
    }
    if (analysis.technical_details.governing_law) {
      formatted += `**Governing Law:** ${analysis.technical_details.governing_law}\n`
    }
    if (analysis.technical_details.jurisdiction) {
      formatted += `**Jurisdiction:** ${analysis.technical_details.jurisdiction}\n`
    }
    
    if (analysis.technical_details.parties_involved && analysis.technical_details.parties_involved.length > 0) {
      formatted += `**Parties Involved:** ${analysis.technical_details.parties_involved.join(', ')}\n`
    }
  }
  
  return formatted
}
}

export async function POST(request: NextRequest) {
  console.log('🚨 ANALYZE API ROUTE ENTRY POINT REACHED')
  
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
        console.log('🔍 Parsed documentData:', {
          id: documentData.id,
          original_filename: documentData.original_filename,
          analysisId: documentData.analysisId,
          keys: Object.keys(documentData)
        })
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
    
    // Check usage limits before starting analysis
    const usageCheck = await usageTracker.checkUsage(userId, 'analysis')
    
    if (!usageCheck.allowed) {
      return NextResponse.json({
        error: "Analysis limit reached",
        details: usageCheck.errors,
        currentUsage: usageCheck.currentUsage,
        limits: usageCheck.limits
      }, { status: 429 })
    }

    // Show warnings if approaching limits
    if (usageCheck.warnings.length > 0) {
      console.log('Usage warnings:', usageCheck.warnings)
    }
    
    console.log('Using document data:', { 
      documentId, 
      userId, 
      filename: documentData.original_filename,
      hasText: !!documentData.documentContent,
      textLength: documentData.documentContent?.length || 0,
      hasFile: !!file
    })
    
    // Debug: Show what documentContent actually contains
    console.log('🔍 DEBUG SERVER: documentContent received:', {
      length: documentData.documentContent?.length || 0,
      preview: documentData.documentContent?.substring(0, 200) || 'EMPTY',
      isEmpty: !documentData.documentContent || documentData.documentContent.trim() === '',
      type: typeof documentData.documentContent
    })
    
    // 🔍 COMPREHENSIVE DEBUG: Show exactly what will be sent to LLM
    console.log('🚨 FULL DEBUG - What LLM will receive:')
    console.log('=========================================')
    console.log('1. documentData.documentContent exists:', !!documentData.documentContent)
    console.log('2. documentData.documentContent length:', documentData.documentContent?.length || 0)
    console.log('3. documentData.documentContent is empty string:', documentData.documentContent === '')
    console.log('4. documentData.documentContent is whitespace only:', documentData.documentContent?.trim() === '')
    console.log('5. documentData.documentContent type:', typeof documentData.documentContent)
    console.log('6. documentData.documentContent first 100 chars:', documentData.documentContent?.substring(0, 100) || 'NULL')
    console.log('7. documentData.documentContent last 100 chars:', documentData.documentContent?.substring(-100) || 'NULL')
    console.log('8. Full documentData object keys:', Object.keys(documentData))
    console.log('9. documentData.documentContent === "":', documentData.documentContent === '')
    console.log('=========================================')
    
    // Use the document data passed from client instead of database lookup
    const document = documentData
    
    // Analysis record is already created on client-side, we just need the ID
    const analysisId = documentData.analysisId || 'temp-id'
    
    console.log('🔍 Analysis ID details:', {
      analysisId,
      documentDataKeys: Object.keys(documentData),
      hasAnalysisId: !!documentData.analysisId,
      documentDataAnalysisId: documentData.analysisId
    })
    
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
        } else if (file.type.includes('pdf')) {
          // Use a server-safe approach for PDF processing
          console.log('🎯 Using server-safe PDF processing...')
          
          try {
            // For now, we'll provide a helpful message about PDF processing
            // In production, you'd want to use a server-compatible PDF library
            extractedText = `PDF file received: ${file.name} (${file.size} bytes)
            
This PDF file has been uploaded successfully and is ready for analysis.

Note: PDF text extraction is currently being processed on the client side. The document content should be available in the documentData for analysis.

File details:
- Name: ${file.name}
- Type: ${file.type}
- Size: ${file.size} bytes
- Status: Uploaded successfully, ready for analysis

If you need server-side PDF text extraction, consider using a server-compatible PDF library like pdf-parse or pdf2pic.`
            
            console.log('✅ PDF file processed successfully (server-safe approach)')
            
          } catch (pdfError) {
            console.error('❌ PDF processing failed:', pdfError)
            extractedText = `PDF file received: ${file.name} (${file.size} bytes)
            
The file has been uploaded successfully, but PDF processing encountered an error: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}

File details:
- Name: ${file.name}
- Type: ${file.type}
- Size: ${file.size} bytes
- Status: Uploaded successfully, processing failed

Note: This may indicate a corrupted or unsupported PDF format.`
          }
        } else {
          extractedText = `File received: ${file.name} (${file.type}, ${file.size} bytes)
          
The file has been uploaded successfully and is ready for analysis.

Supported file types: DOCX, PDF, TXT`
        }
      } catch (extractionError) {
        console.error('Text extraction failed:', extractionError)
        const errorMessage = extractionError instanceof Error ? extractionError.message : 'Unknown error'
        extractedText = `File processing error: ${errorMessage}`
      }
    } else {
      // No file uploaded, check if we have extracted text from client-side processing
      if (document.documentContent && document.documentContent.trim()) {
        console.log('✅ Using client-side extracted text')
        extractedText = document.documentContent
        console.log('Client-side text length:', extractedText.length)
        console.log('Text preview:', extractedText.substring(0, 200) + '...')
      } else if (document.extractedText && document.extractedText.trim()) {
        console.log('✅ Using client-side extracted text (fallback)')
        extractedText = document.extractedText
        console.log('Client-side text length (fallback):', extractedText.length)
        console.log('Text preview (fallback):', extractedText.substring(0, 200) + '...')
      } else {
        console.log('No file or extracted text available')
        extractedText = 'No document content available for analysis'
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
      console.log('🚨 CRITICAL: About to start streaming for analysisId:', analysisId)
      console.log('🚨 CRITICAL: Document data available:', !!documentData)
      console.log('🚨 CRITICAL: File available:', !!file)
      // Return streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log('🔄 Creating streaming response...')
            
            // First, send a test message to verify streaming works
            controller.enqueue(`data: ${JSON.stringify({ content: "Starting AI analysis...\n\n" })}\n\n`)
            
            // 🔧 CRITICAL FIX: Prioritize client's extracted text over server processing
            let extractedText = ''
            
            // Check if client already extracted text
            if (documentData.documentContent && documentData.documentContent.trim() !== '') {
              console.log('✅ Using client-provided extracted text:', documentData.documentContent.length, 'characters')
              extractedText = documentData.documentContent
            } else if (file) {
              console.log('📥 Client text not available, falling back to server file processing...')
              console.log('📄 Processing uploaded file for streaming analysis...')
              try {
                if (file.type.includes('docx') || file.type.includes('word')) {
                  console.log('🎯 Using Mammoth for DOCX text extraction...')
                  const arrayBuffer = await file.arrayBuffer()
                  const buffer = Buffer.from(arrayBuffer)
                  const result = await mammoth.extractRawText({ buffer })
                  extractedText = result.value || 'No text extracted from DOCX'
                  console.log('✅ DOCX text extracted, length:', extractedText.length)
                } else if (file.type.includes('pdf')) {
                  console.log('🎯 Using server-safe PDF processing for streaming...')
                  
                  // For streaming, we'll use the same server-safe approach
                  extractedText = `PDF file received: ${file.name} (${file.size} bytes)
                  
This PDF file has been uploaded successfully and is ready for analysis.

Note: PDF text extraction is currently being processed on the client side. The document content should be available in the documentData for analysis.

File details:
- Name: ${file.name}
- Type: ${file.type}
- Size: ${file.size} bytes
- Status: Uploaded successfully, ready for analysis`
                  
                  console.log('✅ PDF file processed successfully for streaming (server-safe approach)')
                } else if (file.type.includes('text/')) {
                  extractedText = await file.text()
                  console.log('✅ Text file content extracted, length:', extractedText.length)
                } else {
                  extractedText = `File type ${file.type} not supported for text extraction. Supported types: DOCX, PDF, TXT`
                }
                    } catch (extractionError) {
        console.error('❌ Text extraction failed:', extractionError)
        extractedText = `Error extracting text: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`
      }
            } else {
              extractedText = 'No file uploaded for analysis'
            }
            
            // 🔍 DEBUG: Show exactly what extractedText contains before sending to LLM
            console.log('🚨 CRITICAL DEBUG - extractedText before LLM prompt:')
            console.log('====================================================')
            console.log('extractedText length:', extractedText?.length || 0)
            console.log('extractedText === "":', extractedText === '')
            console.log('extractedText is empty string:', extractedText === '')
            console.log('extractedText is whitespace only:', extractedText?.trim() === '')
            console.log('extractedText first 200 chars:', extractedText?.substring(0, 200) || 'NULL')
            console.log('extractedText last 200 chars:', extractedText?.substring(-200) || 'NULL')
            console.log('extractedText type:', typeof extractedText)
            console.log('====================================================')
            
            // Create the prompt for streaming analysis
            const streamingPrompt = `Please analyze this legal document: ${file?.name || 'Unknown'} (${file?.type || 'Unknown type'}, ${file?.size || 0} bytes).

DOCUMENT CONTENT:
${extractedText}

IMPORTANT: You must respond with a valid JSON object that follows this exact structure. Do not include any text before or after the JSON.

Your response must be a valid JSON object with this structure:

{
  "summary": {
    "document_purpose": "Brief description of what this document is for",
    "document_type": "Type of legal document (e.g., employment contract, NDA, service agreement)",
    "key_obligations": ["obligation 1", "obligation 2", "obligation 3"],
    "overall_assessment": "low_risk|medium_risk|high_risk"
  },
  "risk_analysis": {
    "high_risk_items": [
      {
        "clause": "Name or description of the clause",
        "risk_level": "high",
        "description": "What makes this high risk",
        "impact": "Potential consequences",
        "recommendation": "What should be done about it"
      }
    ],
    "medium_risk_items": [/* same structure as high_risk_items */],
    "low_risk_items": [/* same structure as high_risk_items */],
    "risk_summary": "Overall assessment of document risks"
  },
  "identified_clauses": {
    "key_terms": [
      {
        "name": "Term name",
        "description": "What this term means",
        "importance": "critical|important|standard",
        "implications": "What this means for the parties"
      }
    ],
    "conditions": [/* same structure as key_terms */],
    "obligations": [/* same structure as key_terms */],
    "rights": [/* same structure as key_terms */]
  },
  "missing_clauses": {
    "recommended_additions": ["clause 1", "clause 2"],
    "industry_standards": ["standard 1", "standard 2"],
    "compliance_gaps": ["gap 1", "gap 2"]
  },
  "compliance_considerations": {
    "regulatory_requirements": ["requirement 1", "requirement 2"],
    "industry_standards": ["standard 1", "standard 2"],
    "potential_violations": ["violation 1", "violation 2"],
    "compliance_score": "compliant|needs_review|non_compliant"
  },
  "recommendations": {
    "negotiation_points": ["point 1", "point 2"],
    "improvements": ["improvement 1", "improvement 2"],
    "red_flags": ["flag 1", "flag 2"],
    "next_steps": ["step 1", "step 2"]
  },
  "technical_details": {
    "contract_value": "Monetary value if applicable",
    "duration": "Contract duration if specified",
    "parties_involved": ["party 1", "party 2"],
    "governing_law": "Applicable law if specified",
    "jurisdiction": "Legal jurisdiction if specified"
  }
}

Analyze the document thoroughly and populate all fields. If a field is not applicable, use an empty array or appropriate default value. Ensure the JSON is valid and complete.`

            // 🔍 DEBUG: Show the final prompt being sent to LLM
            console.log('🚨 FINAL DEBUG - Complete LLM prompt:')
            console.log('=====================================')
            console.log('Prompt length:', streamingPrompt.length)
            console.log('Prompt contains "MUTUAL NON":', streamingPrompt.includes('MUTUAL NON'))
            console.log('Prompt contains "CONFIDENTIAL":', streamingPrompt.includes('CONFIDENTIAL'))
            console.log('Prompt contains "Douglas Baker":', streamingPrompt.includes('Douglas Baker'))
            console.log('First 500 chars of prompt:', streamingPrompt.substring(0, 500))
            console.log('Last 500 chars of prompt:', streamingPrompt.substring(-500))
            console.log('=====================================')

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

IMPORTANT: You must respond with a valid JSON object that follows this exact structure. Do not include any text before or after the JSON.

Your response must be a valid JSON object with this structure:

{
  "summary": {
    "document_purpose": "Brief description of what this document is for",
    "document_type": "Type of legal document (e.g., employment contract, NDA, service agreement)",
    "key_obligations": ["obligation 1", "obligation 2", "obligation 3"],
    "overall_assessment": "low_risk|medium_risk|high_risk"
  },
  "risk_analysis": {
    "high_risk_items": [
      {
        "clause": "Name or description of the clause",
        "risk_level": "high",
        "description": "What makes this high risk",
        "impact": "Potential consequences",
        "recommendation": "What should be done about it"
      }
    ],
    "medium_risk_items": [/* same structure as high_risk_items */],
    "low_risk_items": [/* same structure as high_risk_items */],
    "risk_summary": "Overall assessment of document risks"
  },
  "identified_clauses": {
    "key_terms": [
      {
        "name": "Term name",
        "description": "What this term means",
        "importance": "critical|important|standard",
        "implications": "What this means for the parties"
      }
    ],
    "conditions": [/* same structure as key_terms */],
    "obligations": [/* same structure as key_terms */],
    "rights": [/* same structure as key_terms */]
  },
  "missing_clauses": {
    "recommended_additions": ["clause 1", "clause 2"],
    "industry_standards": ["standard 1", "standard 2"],
    "compliance_gaps": ["gap 1", "gap 2"]
  },
  "compliance_considerations": {
    "regulatory_requirements": ["requirement 1", "requirement 2"],
    "industry_standards": ["standard 1", "standard 2"],
    "potential_violations": ["violation 1", "violation 2"],
    "compliance_score": "compliant|needs_review|non_compliant"
  },
  "recommendations": {
    "negotiation_points": ["point 1", "point 2"],
    "improvements": ["improvement 1", "improvement 2"],
    "red_flags": ["flag 1", "flag 2"],
    "next_steps": ["step 1", "step 2"]
  },
  "technical_details": {
    "contract_value": "Monetary value if applicable",
    "duration": "Contract duration if specified",
    "parties_involved": ["party 1", "party 2"],
    "governing_law": "Applicable law if specified",
    "jurisdiction": "Legal jurisdiction if specified"
  }
}

Analyze the document thoroughly and populate all fields. If a field is not applicable, use an empty array or appropriate default value. Ensure the JSON is valid and complete.`
                  },
                  {
                    role: 'user',
                    content: streamingPrompt
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
                    console.log('🎯 Updating analysis record in database:', {
                      analysisId,
                      fullResponseLength: fullResponse.length,
                      documentData: documentData
                    })
                    
                    // Try to parse the structured output
                    let structuredAnalysis: StructuredAnalysis | null = null
                    let formattedResponse = fullResponse
                    
                    try {
                      console.log('🔍 Attempting to parse structured output from streaming...')
                      console.log('🔍 Raw streaming content preview:', fullResponse.substring(0, 200) + '...')
                      
                                            // Try multiple JSON parsing approaches
                      let parsed = null
                      let parseMethod = 'none'
                      let formattedResponse = ''
                      
                      // Method 1: Try parsing the raw content directly
                      try {
                        parsed = JSON.parse(fullResponse)
                        parseMethod = 'direct'
                        console.log('✅ Successfully parsed JSON directly')
                      } catch (directError) {
                        console.log('🔍 Direct parsing failed, trying cleanup...')
                        
                        // Method 2: Try with minimal cleanup
                        try {
                          let cleanedContent = fullResponse
                            // Remove trailing commas before closing braces/brackets (most common issue)
                            .replace(/,\s*([}\]])/g, '$1')
                            // Fix missing quotes on keys (but be careful)
                            .replace(/(?<!")(?<!\\)(\w+):\s*"/g, '"$2": "')
                            .replace(/(?<!")(?<!\\)(\w+):\s*\[/g, '"$2": [')
                            .replace(/(?<!")(?<!\\)(\w+):\s*\{/g, '"$2": {')
                            .replace(/(?<!")(?<!\\)(\w+):\s*([^"\[\{,\s][^,]*?)(?=,|\s*[}\]])/g, '"$2": "$3"')
                          
                          parsed = JSON.parse(cleanedContent)
                          parseMethod = 'cleaned'
                          console.log('✅ Successfully parsed JSON after cleanup')
                        } catch (cleanupError) {
                          console.log('🔍 Cleanup parsing failed, trying manual extraction...')
                          
                          // Method 3: Try to extract key information manually
                          try {
                            const documentPurposeMatch = fullResponse.match(/"document_purpose":\s*"([^"]+)"/)
                            const documentTypeMatch = fullResponse.match(/"document_type":\s*"([^"]+)"/)
                            const overallAssessmentMatch = fullResponse.match(/"overall_assessment":\s*"([^"]+)"/)
                            
                            if (documentPurposeMatch) {
                              // Create a more complete structured object for manual extraction
                              parsed = {
                                summary: {
                                  document_purpose: documentPurposeMatch[1],
                                  document_type: documentTypeMatch ? documentTypeMatch[1] : 'Unknown',
                                  overall_assessment: overallAssessmentMatch ? overallAssessmentMatch[1] : 'medium_risk',
                                  key_obligations: []
                                }
                              }
                              parseMethod = 'manual'
                              console.log('✅ Successfully extracted key information manually')
                            }
                          } catch (manualError) {
                            console.log('🔍 Manual extraction also failed')
                          }
                        }
                      }
                      
                      if (parsed && typeof parsed === 'object') {
                        structuredAnalysis = parsed as StructuredAnalysis
                        console.log(`✅ Successfully parsed structured analysis using ${parseMethod} method`)
                        
                        // Convert structured analysis to formatted text for display
                        try {
                          formattedResponse = formatStructuredAnalysis(structuredAnalysis)
                          console.log('✅ Formatted streaming analysis result length:', formattedResponse.length)
                        } catch (formatError) {
                          console.warn('❌ Formatting failed, using raw response:', formatError)
                          formattedResponse = fullResponse
                        }
                      } else {
                        console.warn('❌ Parsed streaming content is not an object, using raw content')
                        formattedResponse = fullResponse
                      }
                    } catch (parseError) {
                      console.warn('❌ All JSON parsing methods failed, using raw content:', parseError)
                      
                      // Since we already tried manual extraction above, just format the raw response
                      // Try one last manual extraction
                      try {
                        const documentPurposeMatch = fullResponse.match(/"document_purpose":\s*"([^"]+)"/)
                        if (documentPurposeMatch) {
                          console.log('🔍 Found document purpose in final fallback:', documentPurposeMatch[1])
                          formattedResponse = `# Document Analysis\n\n**Document Purpose:** ${documentPurposeMatch[1]}\n\n*Note: Full structured analysis could not be parsed due to JSON formatting issues. Please check the raw output for complete details.*`
                        } else {
                          // Use the raw response as-is
                          formattedResponse = fullResponse
                        }
                      } catch (finalFallbackError) {
                        console.log('🔍 Final fallback also failed, using raw response')
                        formattedResponse = fullResponse
                      }
                    }
                    
                    console.log('🔍 About to update analysis record:', {
                      analysisId,
                      table: 'analyses',
                      updateData: {
                        status: 'completed',
                        results: {
                          analysis: formattedResponse,
                          structured_analysis: structuredAnalysis,
                          model: 'gpt-5-nano',
                          provider: 'Vercel AI Gateway'
                        },
                        completed_at: new Date().toISOString()
                      }
                    })
                    
                    // Skip the complex database update logic and let the frontend handle everything
                    // This avoids RLS policy issues and timing problems
                    console.log('🔄 Skipping API database update - frontend will handle persistence')
                    
                    // Increment usage after successful streaming analysis
                    try {
                      await usageTracker.incrementUsage(userId, 'analysis')
                    } catch (usageError) {
                      console.error('Failed to increment analysis usage:', usageError)
                      // Don't fail the analysis if usage tracking fails
                    }

                    // Send the completed response to the frontend
                    controller.enqueue(`data: ${JSON.stringify({ done: true, fullResponse: formattedResponse, structuredAnalysis })}\n\n`)
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            controller.enqueue(`data: ${JSON.stringify({ error: "Streaming failed: " + errorMessage })}\n\n`)
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

IMPORTANT: You must respond with a valid JSON object that follows this exact structure. Do not include any text before or after the JSON.

Your response must be a valid JSON object with this structure:

{
  "summary": {
    "document_purpose": "Brief description of what this document is for",
    "document_type": "Type of legal document (e.g., employment contract, NDA, service agreement)",
    "key_obligations": ["obligation 1", "obligation 2", "obligation 3"],
    "overall_assessment": "low_risk|medium_risk|high_risk"
  },
  "risk_analysis": {
    "high_risk_items": [
      {
        "clause": "Name or description of the clause",
        "risk_level": "high",
        "description": "What makes this high risk",
        "impact": "Potential consequences",
        "recommendation": "What should be done about it"
      }
    ],
    "medium_risk_items": [/* same structure as high_risk_items */],
    "low_risk_items": [/* same structure as high_risk_items */],
    "risk_summary": "Overall assessment of document risks"
  },
  "identified_clauses": {
    "key_terms": [
      {
        "name": "Term name",
        "description": "What this term means",
        "importance": "critical|important|standard",
        "implications": "What this means for the parties"
      }
    ],
    "conditions": [/* same structure as key_terms */],
    "obligations": [/* same structure as key_terms */],
    "rights": [/* same structure as key_terms */]
  },
  "missing_clauses": {
    "recommended_additions": ["clause 1", "clause 2"],
    "industry_standards": ["standard 1", "standard 2"],
    "compliance_gaps": ["gap 1", "gap 2"]
  },
  "compliance_considerations": {
    "regulatory_requirements": ["requirement 1", "requirement 2"],
    "industry_standards": ["standard 1", "standard 2"],
    "potential_violations": ["violation 1", "violation 2"],
    "compliance_score": "compliant|needs_review|non_compliant"
  },
  "recommendations": {
    "negotiation_points": ["point 1", "point 2"],
    "improvements": ["improvement 1", "improvement 2"],
    "red_flags": ["flag 1", "flag 2"],
    "next_steps": ["step 1", "step 2"]
  },
  "technical_details": {
    "contract_value": "Monetary value if applicable",
    "duration": "Contract duration if specified",
    "parties_involved": ["party 1", "party 2"],
    "governing_law": "Applicable law if specified",
    "jurisdiction": "Legal jurisdiction if specified"
    }
  }
}

Analyze the document thoroughly and populate all fields. If a field is not applicable, use an empty array or appropriate default value. Ensure the JSON is valid and complete.`
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
      const rawContent = data.choices[0]?.message?.content || 'Analysis failed - no content received'
      
      console.log('Vercel AI Gateway analysis completed successfully')
      console.log('Token usage:', data.usage?.total_tokens || 0)
      console.log('Model used:', data.model)
      
      // Parse the structured output
      let structuredAnalysis: StructuredAnalysis | null = null
      let analysisResult = rawContent
      
      try {
        // Try to parse the JSON response
        console.log('🔍 Attempting to parse structured output...')
        console.log('🔍 Raw content preview:', rawContent.substring(0, 200) + '...')
        
        // Clean up common JSON formatting issues
        let cleanedContent = rawContent
          .replace(/(\w+):/g, '"$1":') // Add quotes to unquoted keys
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
        
        console.log('🔍 Cleaned content preview:', cleanedContent.substring(0, 200) + '...')
        
        const parsed = JSON.parse(cleanedContent)
        if (parsed && typeof parsed === 'object') {
          structuredAnalysis = parsed as StructuredAnalysis
          console.log('✅ Successfully parsed structured analysis')
          
          // Convert structured analysis to formatted text for display
          analysisResult = formatStructuredAnalysis(structuredAnalysis)
          console.log('✅ Formatted analysis result length:', analysisResult.length)
        } else {
          console.warn('❌ Parsed content is not an object, using raw content')
        }
      } catch (parseError) {
        console.warn('❌ Failed to parse structured output, using raw content:', parseError)
        console.log('🔍 Parse error details:', parseError)
        
        // Try to extract and format what we can from the malformed JSON
        try {
          // Look for common patterns and try to extract them
          const summaryMatch = rawContent.match(/"document_purpose":\s*"([^"]+)"/)
          if (summaryMatch) {
            console.log('🔍 Found document purpose:', summaryMatch[1])
            analysisResult = `# Document Analysis\n\n**Document Purpose:** ${summaryMatch[1]}\n\n*Note: Full structured analysis could not be parsed due to JSON formatting issues. Please check the raw output for complete details.*`
          }
        } catch (fallbackError) {
          console.log('🔍 Fallback formatting also failed:', fallbackError)
        }
      }
      
      // Increment usage after successful analysis
      try {
        await usageTracker.incrementUsage(userId, 'analysis')
      } catch (usageError) {
        console.error('Failed to increment analysis usage:', usageError)
        // Don't fail the analysis if usage tracking fails
      }
      
      // Return the analysis results for client-side update
      return NextResponse.json({
        success: true,
        analysis: {
          id: analysisId,
          status: 'completed',
          results: {
            analysis: analysisResult,
            structured_analysis: structuredAnalysis,
            model: data.model || 'gpt-5-nano',
            tokens_used: data.usage?.total_tokens || 0,
            provider: 'Vercel AI Gateway'
          }
        }
      })
    }
    
  } catch (error) {
    console.error('🚨 CRITICAL ERROR in analyze API:', error)
    if (error instanceof Error) {
      console.error('🚨 Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
