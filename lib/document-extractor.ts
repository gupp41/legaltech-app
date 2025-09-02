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
    
    // Provide more specific error messages based on file type and error
    let errorMessage = 'Failed to extract text'
    let suggestions = 'Please try using a different file format or browser.'
    
    if (error instanceof Error) {
      if (error.message.includes('corrupted') || error.message.includes('Invalid PDF structure')) {
        errorMessage = 'The document appears to be corrupted or has an invalid structure'
        suggestions = 'Please try:\n1. Re-downloading the file if it was transferred over the internet\n2. Converting to a different format (e.g., .txt)\n3. Using a different browser\n4. Checking if the file opens correctly in other applications'
      } else if (error.message.includes('PDF processing library failed to load')) {
        errorMessage = 'PDF processing library failed to load'
        suggestions = 'Please try:\n1. Refreshing the page\n2. Using a different browser\n3. Checking your internet connection'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Document processing timed out'
        suggestions = 'Please try:\n1. Using a smaller file\n2. Converting to a different format\n3. Using a different browser'
      } else if (error.message.includes('empty') || error.message.includes('too small')) {
        errorMessage = 'The document file is empty or too small'
        suggestions = 'Please check that the file contains content and try again.'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      text: `Document processing failed: ${file.name}\n\n${errorMessage}\n\n${suggestions}`,
      wordCount: 0,
      success: false,
      error: errorMessage
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
    
    // Basic file validation before attempting to import PDF.js
    if (file.size === 0) {
      throw new Error('PDF file is empty (0 bytes)')
    }
    
    if (file.size < 100) {
      throw new Error('PDF file is too small to be a valid PDF document')
    }
    
    // Check file type
    if (file.type && file.type !== 'application/pdf') {
      console.warn('File type mismatch:', file.type, 'expected application/pdf')
    }
    
    // Dynamically import pdfjs-dist only when needed (client-side only)
    console.log('Importing pdfjs-dist...')
    let pdfjsLib
    try {
      pdfjsLib = await import('pdfjs-dist')
      console.log('pdfjs-dist imported successfully, version:', (pdfjsLib as any).version)
    } catch (importError) {
      console.error('Failed to import pdfjs-dist:', importError)
      throw new Error('PDF processing library failed to load. Please try refreshing the page or using a different browser.')
    }
    
    // Configure worker - use a local worker approach to avoid CORS issues
    console.log('Configuring PDF.js with worker...')
    
    try {
      // Get the actual version from the imported library
      const version = (pdfjsLib as any).version || '4.10.38';
      console.log('PDF.js library version:', version);
      
      // For version 4.10.38, use the correct worker configuration
      if (pdfjsLib.GlobalWorkerOptions) {
        // Use local worker file that matches the library version
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
        console.log('PDF worker configured with local worker file');
      } else {
        console.log('GlobalWorkerOptions not available, trying alternative configuration');
        // Try alternative worker configuration
        if ('setWorkerSrc' in pdfjsLib && typeof pdfjsLib.setWorkerSrc === 'function') {
          (pdfjsLib as any).setWorkerSrc('/pdf.worker.js');
          console.log('PDF worker configured using setWorkerSrc');
        } else {
          console.log('No worker configuration method available, will disable worker');
          // Disable worker if no configuration method is available
          if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          }
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
    
    // Basic PDF validation before attempting to load
    if (uint8Array.length < 4) {
      throw new Error('File is too small to be a valid PDF document')
    }
    
    // Check for PDF header
    const header = String.fromCharCode(uint8Array[0], uint8Array[1], uint8Array[2], uint8Array[3])
    if (header !== '%PDF') {
      console.warn('Warning: File does not start with PDF header. Header found:', header)
      console.warn('First 20 bytes:', Array.from(uint8Array.slice(0, 20)).map(b => String.fromCharCode(b)).join(''))
      
      // Check if this might be a corrupted PDF by looking for PDF-like content
      const first100Bytes = Array.from(uint8Array.slice(0, 100)).map(b => String.fromCharCode(b)).join('')
      if (first100Bytes.includes('PDF') || first100Bytes.includes('pdf')) {
        console.warn('File contains PDF-like content but has invalid header - may be corrupted')
        throw new Error('The PDF file appears to be corrupted or has an invalid structure')
      } else {
        throw new Error('The file does not appear to be a valid PDF (missing PDF header)')
      }
    } else {
      console.log('PDF header validation passed:', header)
    }
    
    // Additional corruption checks
    try {
      // Check for common PDF corruption patterns
      const fileContent = Array.from(uint8Array.slice(0, 1000)).map(b => String.fromCharCode(b)).join('')
      
      // Look for PDF version indicator
      if (!fileContent.includes('PDF-') && !fileContent.includes('pdf-')) {
        console.warn('Warning: No PDF version indicator found in first 1000 bytes')
      }
      
      // Check for end-of-file marker (should be present in valid PDFs)
      const last1000Bytes = Array.from(uint8Array.slice(-1000)).map(b => String.fromCharCode(b)).join('')
      if (!last1000Bytes.includes('%%EOF')) {
        console.warn('Warning: No %%EOF marker found - PDF may be truncated or corrupted')
      }
      
    } catch (validationError) {
      console.warn('PDF validation check failed:', validationError)
      // Continue with loading attempt
    }
    
    // Load the PDF document with timeout and progress tracking
    console.log('Loading PDF document...')
    console.log('PDF file size:', file.size, 'bytes')
    console.log('PDF file type:', file.type)
    console.log('PDF file name:', file.name)
    
    // Create PDF loading task with all options
    const loadingTask = (pdfjsLib as any).getDocument({ 
      data: uint8Array,
      // Allow worker usage now that version is fixed
      disableWorker: false, // Allow worker usage for better performance
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
    } catch (error: any) {
      console.error('PDF loading failed:', error)
      
      // Provide more specific error information
      if (error.message?.includes('Invalid PDF structure')) {
        console.error('PDF structure analysis:')
        console.error('- File size:', file.size, 'bytes')
        console.error('- File type:', file.type)
        console.error('- First 100 bytes:', Array.from(uint8Array.slice(0, 100)).map(b => b.toString(16).padStart(2, '0')).join(' '))
        console.error('- PDF header check:', uint8Array.slice(0, 4).toString() === '%PDF' ? 'Valid PDF header' : 'Invalid PDF header')
        
        // Try to provide more helpful error message
        if (file.size === 0) {
          throw new Error('PDF file is empty (0 bytes)')
        } else if (file.size < 100) {
          throw new Error('PDF file is too small to be a valid PDF document')
        } else if (!uint8Array.slice(0, 4).toString().includes('%PDF')) {
          throw new Error('File does not appear to be a valid PDF (missing PDF header)')
        } else {
          // Try one more time with worker disabled as a fallback
          console.log('Attempting fallback: disabling worker and retrying...')
          try {
            const fallbackLoadingTask = (pdfjsLib as any).getDocument({ 
              data: uint8Array,
              disableWorker: true, // Disable worker as fallback
              disableRange: true,  // Disable range requests
              disableStream: true, // Disable streaming
              maxImageSize: -1,
              cMapUrl: null,
              cMapPacked: false,
              verbosity: 0 // Reduce verbosity for fallback
            })
            
            const fallbackPdf = await Promise.race([fallbackLoadingTask.promise, timeoutPromise])
            console.log('PDF loaded successfully with fallback (worker disabled), pages:', fallbackPdf.numPages)
            pdf = fallbackPdf
          } catch (fallbackError: any) {
            console.error('Fallback PDF loading also failed:', fallbackError)
            throw new Error(`PDF structure is invalid or corrupted. File size: ${file.size} bytes, Type: ${file.type}. Fallback attempt also failed: ${fallbackError.message}`)
          }
        }
      } else if (error.message?.includes('timeout')) {
        throw new Error('PDF loading timed out. The file may be too large or corrupted.')
      } else {
        throw new Error(`PDF loading failed: ${error.message || 'Unknown error'}`)
      }
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
    let userFriendlyMessage = 'PDF processing failed'
    
    if (error instanceof Error) {
      errorDetails = `${error.name}: ${error.message}`
      console.error('Error stack:', error.stack)
      
      // Provide more specific error messages based on the error type
      if (error.message.includes('Invalid PDF structure')) {
        userFriendlyMessage = 'The PDF file appears to be corrupted or has an invalid structure'
      } else if (error.message.includes('PDF file is empty')) {
        userFriendlyMessage = 'The PDF file is empty (0 bytes)'
      } else if (error.message.includes('too small')) {
        userFriendlyMessage = 'The PDF file is too small to be a valid document'
      } else if (error.message.includes('PDF processing library failed to load')) {
        userFriendlyMessage = 'PDF processing library failed to load'
      } else if (error.message.includes('timeout')) {
        userFriendlyMessage = 'PDF processing timed out - the file may be too large or corrupted'
      } else if (error.message.includes('missing PDF header')) {
        userFriendlyMessage = 'The file does not appear to be a valid PDF (missing PDF header)'
      }
    } else if (typeof error === 'string') {
      errorDetails = error
    } else {
      errorDetails = JSON.stringify(error)
    }
    
    const message = `PDF processing failed: ${file.name}

${userFriendlyMessage}

Error details: ${errorDetails}

This could be due to:
- File corruption or invalid PDF structure
- Unsupported PDF format or version
- Browser compatibility issues
- Network connectivity problems
- File size limitations

To analyze this document, please try:
1. Converting to text format (.txt) from the original source
2. Using a different browser or device
3. Checking if the PDF file opens correctly in other applications
4. Re-downloading the file if it was transferred over the internet
5. Using OCR software if the PDF contains scanned images`

    return {
      text: message,
      wordCount: message.split(/\s+/).filter(word => word.length > 0).length,
      success: false,
      error: `PDF extraction failed: ${userFriendlyMessage}`
    }
  }
}

async function extractTextFromDOCX(file: File): Promise<ExtractedText> {
  try {
    console.log('Starting DOCX text extraction for:', file.name, file.size, 'bytes')
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('DOCX extraction only works in browser environment')
    }
    
    // Dynamically import mammoth only when needed (client-side only)
    console.log('Importing mammoth...')
    const mammoth = await import('mammoth')
    console.log('mammoth imported successfully')
    
    console.log('Converting file to ArrayBuffer...')
    const arrayBuffer = await file.arrayBuffer()
    console.log('ArrayBuffer size:', arrayBuffer.byteLength)
    
    console.log('Extracting text from DOCX...')
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    console.log('DOCX extraction result:', {
      textLength: result.value.length,
      messages: result.messages.length
    })
    
    // Log any warnings or messages from mammoth
    if (result.messages.length > 0) {
      console.log('Mammoth messages:', result.messages)
    }
    
    const extractedText = result.value.trim()
    
    if (extractedText) {
      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
      console.log('DOCX extraction successful, word count:', wordCount)
      return {
        text: extractedText,
        wordCount,
        success: true
      }
    } else {
      console.warn('DOCX extraction completed but no text content found')
      const message = `Word document processed: ${file.name}

No readable text content was found. This could be because:
- The document contains only images
- The document is password protected
- The content is in an unsupported format
- The document is corrupted

To analyze this document, you may need to:
1. Save as a text file (.txt) from Word
2. Copy and paste the content manually
3. Use a different document format`

      return {
        text: message,
        wordCount: message.split(/\s+/).filter(word => word.length > 0).length,
        success: false,
        error: 'No text content found in DOCX'
      }
    }
  } catch (error) {
    console.error('DOCX extraction error:', error)
    
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
    
    const message = `Word document processing failed: ${file.name}

Error: ${errorDetails}

This could be due to:
- Unsupported DOCX format
- Browser compatibility problems
- File corruption
- Network connectivity issues

To analyze this document, please try:
1. Saving as text format (.txt) from Word
2. Using a different browser
3. Checking if the file is corrupted
4. Converting to PDF format`

    return {
      text: message,
      wordCount: message.split(/\s+/).filter(word => word.length > 0).length,
      success: false,
      error: `DOCX extraction failed: ${errorDetails}`
    }
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
