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
    console.log('🔍 JSON Parser: Validation failed - data is not an object')
    return false
  }

  // Check for common analysis structure - be more lenient
  const hasSummary = data.summary && typeof data.summary === 'object'
  const hasIdentifiedClauses = data.identified_clauses && typeof data.identified_clauses === 'object'
  const hasMissingClauses = data.missing_clauses && typeof data.missing_clauses === 'object'
  const hasComplianceConsiderations = data.compliance_considerations && typeof data.compliance_considerations === 'object'
  const hasRiskAnalysis = data.risk_analysis && typeof data.risk_analysis === 'object'
  const hasAiSuggestedLanguage = data.ai_suggested_language && Array.isArray(data.ai_suggested_language)
  
  // Also check for any string properties that might indicate analysis content
  const hasStringContent = Object.values(data).some(value => 
    typeof value === 'string' && value.length > 10
  )

  const isValid = hasSummary || hasIdentifiedClauses || hasMissingClauses || hasComplianceConsiderations || hasRiskAnalysis || hasAiSuggestedLanguage || hasStringContent
  
  console.log('🔍 JSON Parser: Structure validation result:', {
    hasSummary,
    hasIdentifiedClauses,
    hasMissingClauses,
    hasComplianceConsiderations,
    hasRiskAnalysis,
    hasAiSuggestedLanguage,
    hasStringContent,
    isValid
  })

  return isValid
}

/**
 * Extract and clean analysis data from various formats
 */
export function extractAnalysisData(rawData: string): ParseResult {
  if (!rawData || typeof rawData !== 'string') {
    return {
      success: false,
      error: 'Invalid input: expected non-empty string'
    }
  }

  console.log('🔍 JSON Parser: Starting analysis data extraction...')
  console.log('🔍 JSON Parser: Input length:', rawData.length)
  console.log('🔍 JSON Parser: Input preview:', rawData.substring(0, 200) + '...')

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
    },
    {
      name: 'manual_extraction',
      extractor: () => {
        console.log('🔍 JSON Parser: Attempting manual extraction...')
        try {
          // Try to extract key fields manually
          const documentPurposeMatch = rawData.match(/"document_purpose":\s*"([^"]+)"/)
          const documentTypeMatch = rawData.match(/"document_type":\s*"([^"]+)"/)
          const overallAssessmentMatch = rawData.match(/"overall_assessment":\s*"([^"]+)"/)
          
          if (documentPurposeMatch) {
            const manuallyParsed = {
              summary: {
                document_purpose: documentPurposeMatch[1],
                document_type: documentTypeMatch ? documentTypeMatch[1] : 'Unknown',
                overall_assessment: overallAssessmentMatch ? overallAssessmentMatch[1] : 'medium_risk',
                key_obligations: []
              },
              identified_clauses: { key_terms: [], conditions: [], obligations: [], rights: [] },
              missing_clauses: [],
              compliance_considerations: { compliance_score: 'unknown', regulatory_requirements: [] },
              ai_suggested_language: []
            }
            return { success: true, data: manuallyParsed }
          }
          return { success: false, error: 'No key fields found for manual extraction' }
        } catch (error) {
          return { success: false, error: `Manual extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
        }
      }
    }
  ]

  for (const method of methods) {
    try {
      console.log(`🔍 JSON Parser: Trying method '${method.name}'...`)
      const result = method.extractor()
      if (result.success) {
        console.log(`🔍 JSON Parser: Method '${method.name}' succeeded`)
        if (validateAnalysisStructure(result.data)) {
          console.log(`🔍 JSON Parser: Method '${method.name}' data structure validated`)
          return {
            ...result,
            method: method.name
          }
        } else {
          console.log(`🔍 JSON Parser: Method '${method.name}' succeeded but structure validation failed`)
          // Even if structure validation fails, return the data if it's not null
          if (result.data && typeof result.data === 'object') {
            console.log(`🔍 JSON Parser: Returning unvalidated data from method '${method.name}'`)
            return {
              ...result,
              method: method.name
            }
          }
        }
      } else {
        console.log(`🔍 JSON Parser: Method '${method.name}' failed:`, result.error)
      }
    } catch (error) {
      console.log(`🔍 JSON Parser: Method '${method.name}' threw error:`, error instanceof Error ? error.message : 'Unknown error')
      continue
    }
  }

  console.log('🔍 JSON Parser: All methods failed, returning error')
  return {
    success: false,
    error: 'All analysis extraction methods failed'
  }
}
