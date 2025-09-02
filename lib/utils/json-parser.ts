/**
 * JSON Parsing Utilities
 * Centralized utilities for parsing and cleaning JSON data from AI responses
 */

export interface ParseResult<T = any> {
  success: boolean
  data?: T
  error?: string
  method?: string
}

/**
 * Clean JSON string by removing common issues from AI responses
 */
export function cleanJsonString(jsonString: string): string {
  if (!jsonString || typeof jsonString !== 'string') {
    return ''
  }

  let cleaned = jsonString.trim()

  // Remove common streaming prefixes
  cleaned = cleaned.replace(/^Starting AI analysis\.\.\.\s*/, '')
  cleaned = cleaned.replace(/^Analyzing document\.\.\.\s*/, '')
  cleaned = cleaned.replace(/^Processing\.\.\.\s*/, '')

  // Remove control characters that can break JSON parsing
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '')
  
  // Fix common JSON issues
  cleaned = cleaned
    // Remove trailing commas before closing braces/brackets
    .replace(/,\s*([}\]])/g, '$1')
    // Fix missing quotes on keys
    .replace(/(?<!")(?<!\\)(\w+):\s*"/g, '"$2": "')
    .replace(/(?<!")(?<!\\)(\w+):\s*\[/g, '"$2": [')
    .replace(/(?<!")(?<!\\)(\w+):\s*\{/g, '"$2": {')
    .replace(/(?<!")(?<!\\)(\w+):\s*([^"\[\{,\s][^,]*?)(?=,|\s*[}\]])/g, '"$2": "$3"')
    // Fix escaped quotes
    .replace(/\\"/g, '"')
    // Fix newlines in strings
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')

  return cleaned
}

/**
 * Parse JSON with multiple fallback methods
 */
export function parseJsonWithFallbacks<T = any>(jsonString: string): ParseResult<T> {
  if (!jsonString || typeof jsonString !== 'string') {
    return {
      success: false,
      error: 'Invalid input: expected non-empty string'
    }
  }

  const methods = [
    {
      name: 'direct',
      parser: (str: string) => JSON.parse(str)
    },
    {
      name: 'cleaned',
      parser: (str: string) => JSON.parse(cleanJsonString(str))
    },
    {
      name: 'minimal_cleanup',
      parser: (str: string) => {
        const minimal = str
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/[\x00-\x1F\x7F]/g, '')
        return JSON.parse(minimal)
      }
    }
  ]

  for (const method of methods) {
    try {
      const data = method.parser(jsonString)
      return {
        success: true,
        data,
        method: method.name
      }
    } catch (error) {
      console.log(`🔍 JSON parsing method '${method.name}' failed:`, error instanceof Error ? error.message : 'Unknown error')
      continue
    }
  }

  return {
    success: false,
    error: 'All JSON parsing methods failed'
  }
}

/**
 * Parse streaming JSON data (for AI responses)
 */
export function parseStreamingJson<T = any>(streamData: string): ParseResult<T> {
  if (!streamData || typeof streamData !== 'string') {
    return {
      success: false,
      error: 'Invalid input: expected non-empty string'
    }
  }

  // Try to extract JSON from streaming format
  const lines = streamData.split('\n')
  let jsonContent = ''
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        break
      }
      jsonContent += data
    }
  }

  if (!jsonContent) {
    return {
      success: false,
      error: 'No JSON content found in stream'
    }
  }

  return parseJsonWithFallbacks<T>(jsonContent)
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T = any>(jsonString: string, fallback?: T): T | null {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn('JSON parse failed:', error instanceof Error ? error.message : 'Unknown error')
    return fallback || null
  }
}

/**
 * Validate that parsed data has expected structure
 */
export function validateAnalysisStructure(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false
  }

  // Check for common analysis structure
  const hasSummary = data.summary && typeof data.summary === 'object'
  const hasIdentifiedClauses = data.identified_clauses && typeof data.identified_clauses === 'object'
  const hasMissingClauses = data.missing_clauses && typeof data.missing_clauses === 'object'
  const hasComplianceConsiderations = data.compliance_considerations && typeof data.compliance_considerations === 'object'

  return hasSummary || hasIdentifiedClauses || hasMissingClauses || hasComplianceConsiderations
}

/**
 * Extract and clean analysis data from various formats
 */
export function extractAnalysisData(rawData: string): ParseResult {
  // Try different extraction methods
  const methods = [
    {
      name: 'streaming',
      extractor: () => parseStreamingJson(rawData)
    },
    {
      name: 'direct',
      extractor: () => parseJsonWithFallbacks(rawData)
    },
    {
      name: 'line_by_line',
      extractor: () => {
        const lines = rawData.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const result = parseJsonWithFallbacks(line.slice(6))
            if (result.success) {
              return result
            }
          }
        }
        return { success: false, error: 'No valid JSON found in lines' }
      }
    }
  ]

  for (const method of methods) {
    try {
      const result = method.extractor()
      if (result.success && validateAnalysisStructure(result.data)) {
        return {
          ...result,
          method: method.name
        }
      }
    } catch (error) {
      console.log(`🔍 Analysis extraction method '${method.name}' failed:`, error instanceof Error ? error.message : 'Unknown error')
      continue
    }
  }

  return {
    success: false,
    error: 'All analysis extraction methods failed'
  }
}
