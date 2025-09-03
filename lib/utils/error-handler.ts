/**
 * Error Handling Utilities
 * Centralized utilities for consistent error handling across the application
 */

export interface ErrorDetails {
  message: string
  code?: string
  statusCode?: number
  details?: any
  timestamp?: string
  context?: string
}

export interface ApiErrorResponse {
  error: string
  details?: string
  code?: string
  timestamp?: string
}

/**
 * Create a standardized error object
 */
export function createError(
  message: string,
  options: {
    code?: string
    statusCode?: number
    details?: any
    context?: string
  } = {}
): ErrorDetails {
  return {
    message,
    code: options.code,
    statusCode: options.statusCode,
    details: options.details,
    timestamp: new Date().toISOString(),
    context: options.context
  }
}

/**
 * Handle and log errors consistently
 */
export function handleError(
  error: unknown,
  context: string = 'Unknown'
): ErrorDetails {
  console.error(`🚨 Error in ${context}:`, error)

  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      timestamp: new Date().toISOString(),
      context,
      details: {
        stack: error.stack,
        name: error.name
      }
    }
  }

  if (typeof error === 'string') {
    return {
      message: error,
      timestamp: new Date().toISOString(),
      context
    }
  }

  return {
    message: 'Unknown error occurred',
    details: error,
    timestamp: new Date().toISOString(),
    context
  }
}

/**
 * Create API error response
 */
export function createApiErrorResponse(
  error: unknown,
  statusCode: number = 500,
  context: string = 'API'
): { response: ApiErrorResponse; statusCode: number } {
  const errorDetails = handleError(error, context)
  
  return {
    response: {
      error: errorDetails.message,
      details: errorDetails.details ? JSON.stringify(errorDetails.details) : undefined,
      code: errorDetails.code,
      timestamp: errorDetails.timestamp
    },
    statusCode
  }
}

/**
 * Create a NextResponse for API errors
 */
export function createApiErrorNextResponse(
  error: unknown,
  statusCode: number = 500,
  context: string = 'API'
) {
  const { response, statusCode: code } = createApiErrorResponse(error, statusCode, context)
  return new Response(JSON.stringify(response), {
    status: code,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Handle authentication errors
 */
export function handleAuthError(error: unknown): { response: ApiErrorResponse; statusCode: number } {
  return createApiErrorResponse(
    error,
    401,
    'Authentication'
  )
}

/**
 * Handle validation errors
 */
export function handleValidationError(error: unknown): { response: ApiErrorResponse; statusCode: number } {
  return createApiErrorResponse(
    error,
    400,
    'Validation'
  )
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: unknown): { response: ApiErrorResponse; statusCode: number } {
  return createApiErrorResponse(
    error,
    500,
    'Database'
  )
}

/**
 * Handle file processing errors
 */
export function handleFileProcessingError(error: unknown): { response: ApiErrorResponse; statusCode: number } {
  return createApiErrorResponse(
    error,
    422,
    'File Processing'
  )
}

/**
 * Handle rate limiting errors
 */
export function handleRateLimitError(error: unknown): { response: ApiErrorResponse; statusCode: number } {
  return createApiErrorResponse(
    error,
    429,
    'Rate Limiting'
  )
}

/**
 * Handle external service errors (AI, Stripe, etc.)
 */
export function handleExternalServiceError(error: unknown, service: string): { response: ApiErrorResponse; statusCode: number } {
  return createApiErrorResponse(
    error,
    502,
    `External Service (${service})`
  )
}

/**
 * Safe async function wrapper with error handling
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  context: string = 'Async Operation',
  fallback?: T
): Promise<T | null> {
  try {
    return await asyncFn()
  } catch (error) {
    const errorDetails = handleError(error, context)
    console.error(`🚨 ${context} failed:`, errorDetails)
    return fallback || null
  }
}

/**
 * Safe sync function wrapper with error handling
 */
export function safeSync<T>(
  syncFn: () => T,
  context: string = 'Sync Operation',
  fallback?: T
): T | null {
  try {
    return syncFn()
  } catch (error) {
    const errorDetails = handleError(error, context)
    console.error(`🚨 ${context} failed:`, errorDetails)
    return fallback || null
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    context?: string
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    context = 'Retry Operation'
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        const errorDetails = handleError(error, `${context} (final attempt ${attempt + 1})`)
        throw new Error(`Failed after ${maxRetries + 1} attempts: ${errorDetails.message}`)
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      console.log(`🔄 ${context} attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string = 'Operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${context} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

/**
 * Validate required environment variables
 */
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * Handle user-facing error messages
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Map technical errors to user-friendly messages
    if (error.message.includes('Unauthorized')) {
      return 'Please log in to continue'
    }
    if (error.message.includes('Forbidden')) {
      return 'You do not have permission to perform this action'
    }
    if (error.message.includes('Not Found')) {
      return 'The requested resource was not found'
    }
    if (error.message.includes('timeout')) {
      return 'The operation took too long. Please try again'
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again'
    }
    if (error.message.includes('JSON')) {
      return 'There was an error processing the data. Please try again'
    }
  }

  return 'An unexpected error occurred. Please try again'
}
