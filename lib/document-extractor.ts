export interface ExtractedText {
  text: string
  wordCount: number
  success: boolean
  error?: string
}

export async function extractTextFromDocument(
  file: File
): Promise<ExtractedText> {
  try {
    switch (file.type) {
      case 'text/plain':
        return await extractTextFromTXT(file)
      case 'application/pdf':
        return await extractTextFromPDF(file)
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractTextFromDOCX(file)
      default:
        // For unsupported types, try to extract as text
        return await extractTextFromTXT(file)
    }
  } catch (error) {
    console.error('Error extracting text from document:', error)
    return {
      text: '',
      wordCount: 0,
      success: false,
      error: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function extractTextFromTXT(file: File): Promise<ExtractedText> {
  try {
    const text = await file.text()
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
    
    return {
      text,
      wordCount,
      success: true
    }
  } catch (error) {
    throw new Error(`TXT extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function extractTextFromPDF(file: File): Promise<ExtractedText> {
  try {
    // For now, return a message that PDF extraction requires server-side processing
    // In a production app, you'd upload the PDF to a server endpoint for processing
    const message = `PDF text extraction requires server-side processing. 
    
For now, please upload a text (.txt) or Word (.docx) file, or copy and paste the document content into a text file.

File: ${file.name}
Size: ${(file.size / 1024).toFixed(1)} KB`

    return {
      text: message,
      wordCount: message.split(/\s+/).length,
      success: false,
      error: 'PDF extraction requires server-side processing'
    }
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function extractTextFromDOCX(file: File): Promise<ExtractedText> {
  try {
    // For now, return a message that DOCX extraction requires server-side processing
    // In a production app, you'd upload the DOCX to a server endpoint for processing
    const message = `Word document (.docx) text extraction requires server-side processing.
    
For now, please upload a text (.txt) file, or copy and paste the document content into a text file.

File: ${file.name}
Size: ${(file.size / 1024).toFixed(1)} KB`

    return {
      text: message,
      wordCount: message.split(/\s+/).length,
      success: false,
      error: 'DOCX extraction requires server-side processing'
    }
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function truncateText(text: string, maxLength: number = 8000): string {
  if (text.length <= maxLength) return text
  
  // Try to truncate at sentence boundaries
  const truncated = text.substring(0, maxLength)
  const lastSentence = truncated.lastIndexOf('.')
  
  if (lastSentence > maxLength * 0.8) {
    return truncated.substring(0, lastSentence + 1)
  }
  
  return truncated + '...'
}

// Helper function to create a text file from content
export function createTextFile(content: string, filename: string = 'document.txt'): File {
  const blob = new Blob([content], { type: 'text/plain' })
  return new File([blob], filename, { type: 'text/plain' })
}
