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
    console.log('Starting PDF text extraction for:', file.name, file.size, 'bytes')
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('PDF extraction only works in browser environment')
    }
    
    // Dynamically import pdfjs-dist only when needed (client-side only)
    console.log('Importing pdfjs-dist...')
    const pdfjsLib = await import('pdfjs-dist')
    console.log('pdfjs-dist imported successfully, version:', (pdfjsLib as any).version)
    
    // Configure worker - use a local worker approach to avoid CORS issues
    console.log('Configuring PDF.js with worker...')
    
    try {
      // For v4.x, try to use CDN worker first, then fallback to local
      let workerSrc = '';
      
      try {
        // Try to use CDN worker for better compatibility
        workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
        console.log('Using CDN worker:', workerSrc);
      } catch (cdnError) {
        // Fallback to local worker
        workerSrc = '/pdf.worker.js';
        console.log('Using local worker:', workerSrc);
      }
      
      // For v4.x, set the worker source
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        console.log('PDF worker configured with:', workerSrc);
      } else {
        console.log('GlobalWorkerOptions not available, trying alternative configuration');
        // Try alternative worker configuration for v4.x
        if ('setWorkerSrc' in pdfjsLib && typeof pdfjsLib.setWorkerSrc === 'function') {
          (pdfjsLib as any).setWorkerSrc(workerSrc);
          console.log('PDF worker configured using setWorkerSrc');
        } else {
          throw new Error('No worker configuration method available');
        }
      }
      
    } catch (workerError: any) {
      console.error('Failed to configure PDF worker:', workerError);
      
      // Try to disable worker and use main thread
      console.log('Attempting to disable worker and use main thread...');
      
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      }
      
      // Check if getDocument function is available
      if ('getDocument' in pdfjsLib && typeof (pdfjsLib as any).getDocument === 'function') {
        console.log('Worker disabled, will use main thread for PDF processing');
      } else {
        throw new Error(`Failed to configure PDF.js: ${workerError instanceof Error ? workerError.message : 'Unknown error'}`);
      }
    }
    
    console.log('Converting file to ArrayBuffer...')
    const arrayBuffer = await file.arrayBuffer()
    console.log('ArrayBuffer size:', arrayBuffer.byteLength)
    
    const uint8Array = new Uint8Array(arrayBuffer)
    console.log('Uint8Array created, length:', uint8Array.length)
    
    // Load the PDF document with timeout and progress tracking
    console.log('Loading PDF document...')
    
    // Create PDF loading task with all options
    const loadingTask = pdfjsLib.getDocument({ 
      data: uint8Array,
      // Try to use worker but with better configuration
      disableWorker: false, // Allow worker usage
      disableRange: false,  // Enable range requests
      disableStream: false, // Enable streaming
      // Add more options for better compatibility
      maxImageSize: -1,     // No image size limit
      cMapUrl: null,        // Disable CMap loading
      cMapPacked: false,    // Disable packed CMap
      // Additional options for better performance
      verbosity: 1,         // Show progress
      progressCallback: (progress: any) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`PDF loading progress: ${percent}% (${progress.loaded}/${progress.total})`);
        } else {
          console.log(`PDF loading progress: ${progress.loaded} bytes loaded`);
        }
      }
    })
    
    // Add timeout to prevent hanging - reduced for faster feedback
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF loading timeout')), 30000) // 30 second timeout for faster feedback
    })
    
    console.log('Starting PDF loading with timeout...')
    
    // Add more detailed logging
    console.log('PDF loading task created, waiting for completion...')
    
    let pdf
    try {
      pdf = await Promise.race([loadingTask.promise, timeoutPromise])
      console.log('PDF loaded successfully, pages:', pdf.numPages)
    } catch (error) {
      console.error('PDF loading failed:', error)
      throw error
    }
    
    let fullText = ''
    let processedPages = 0
    
    // Extract text from each page with error handling
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${pdf.numPages}...`)
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Combine text items from the page
        const pageText = textContent.items
          .filter((item: any) => item.str && item.str.trim()) // Filter out empty strings
          .map((item: any) => item.str)
          .join(' ')
        
        if (pageText.trim()) {
          fullText += pageText + '\n\n'
          processedPages++
        }
        
        console.log(`Page ${pageNum} text length:`, pageText.length, 'characters')
      } catch (pageError) {
        console.warn(`Failed to process page ${pageNum}:`, pageError)
        // Continue with other pages
      }
    }
    
    console.log('Total extracted text length:', fullText.length, 'characters')
    console.log('Successfully processed pages:', processedPages, 'out of', pdf.numPages)
    
    if (fullText.trim()) {
      const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length
      console.log('PDF extraction successful, word count:', wordCount)
      return {
        text: fullText.trim(),
        wordCount,
        success: true
      }
    } else {
      console.warn('PDF extraction completed but no text content found')
      const message = `PDF processed: ${file.name} (${pdf.numPages} pages)

No readable text content was found. This could be because:
- The PDF contains only images/scans
- The text is embedded as images
- The PDF is password protected
- The content is in an unsupported format

To analyze this document, you may need to:
1. Use OCR software to convert images to text
2. Copy and paste text manually if visible
3. Save as a text-searchable PDF from the original source`

      return {
        text: message,
        wordCount: message.split(/\s+/).filter(word => word.length > 0).length,
        success: false,
        error: 'No text content found in PDF'
      }
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    
    // Provide detailed error information
    let errorDetails = 'Unknown error'
    if (error instanceof Error) {
      errorDetails = `${error.name}: ${error.message}`
      console.error('Error stack:', error.stack)
    } else if (typeof error === 'string') {
      errorDetails = error
    } else {
      errorDetails = JSON.stringify(error)
    }
    
    const message = `PDF processing failed: ${file.name}

Error: ${errorDetails}

This could be due to:
- Network connectivity issues
- Unsupported PDF format
- Browser compatibility problems
- File corruption

To analyze this document, please try:
1. Converting to text format (.txt)
2. Using a different browser
3. Checking your internet connection
4. Ensuring the PDF is not corrupted`

    return {
      text: message,
      wordCount: message.split(/\s+/).filter(word => word.length > 0).length,
      success: false,
      error: `PDF extraction failed: ${errorDetails}`
    }
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
