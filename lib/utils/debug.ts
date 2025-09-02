/**
 * Debug Utilities
 * Centralized debugging and logging utilities for consistent development experience
 */

// ============================================================================
// LOG LEVELS
// ============================================================================

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// ============================================================================
// DEBUG CONFIGURATION
// ============================================================================

interface DebugConfig {
  level: LogLevel
  enableConsole: boolean
  enableTimestamps: boolean
  enableContext: boolean
  enableColors: boolean
  prefix: string
}

const defaultConfig: DebugConfig = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
  enableConsole: true,
  enableTimestamps: true,
  enableContext: true,
  enableColors: true,
  prefix: '🔍'
}

let config: DebugConfig = { ...defaultConfig }

// ============================================================================
// COLOR UTILITIES
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
} as const

function getColor(level: LogLevel): string {
  if (!config.enableColors) return ''
  
  switch (level) {
    case LogLevel.ERROR: return colors.red
    case LogLevel.WARN: return colors.yellow
    case LogLevel.INFO: return colors.blue
    case LogLevel.DEBUG: return colors.cyan
    case LogLevel.TRACE: return colors.gray
    default: return colors.reset
  }
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

function formatTimestamp(): string {
  if (!config.enableTimestamps) return ''
  return new Date().toISOString()
}

function formatContext(context: string): string {
  if (!config.enableContext || !context) return ''
  return `[${context}]`
}

function formatMessage(level: LogLevel, context: string, message: string, data?: any): string {
  const color = getColor(level)
  const reset = config.enableColors ? colors.reset : ''
  const timestamp = formatTimestamp()
  const contextStr = formatContext(context)
  const levelStr = LogLevel[level]
  
  const parts = [
    config.prefix,
    timestamp,
    contextStr,
    `${color}${levelStr}${reset}`,
    message
  ].filter(Boolean)
  
  return parts.join(' ')
}

// ============================================================================
// CORE LOGGING FUNCTIONS
// ============================================================================

function shouldLog(level: LogLevel): boolean {
  return level <= config.level && config.enableConsole
}

function log(level: LogLevel, context: string, message: string, data?: any): void {
  if (!shouldLog(level)) return
  
  const formattedMessage = formatMessage(level, context, message, data)
  
  switch (level) {
    case LogLevel.ERROR:
      console.error(formattedMessage, data || '')
      break
    case LogLevel.WARN:
      console.warn(formattedMessage, data || '')
      break
    case LogLevel.INFO:
      console.info(formattedMessage, data || '')
      break
    case LogLevel.DEBUG:
      console.log(formattedMessage, data || '')
      break
    case LogLevel.TRACE:
      console.trace(formattedMessage, data || '')
      break
  }
}

// ============================================================================
// PUBLIC LOGGING API
// ============================================================================

export const debug = {
  // Configuration
  setLevel: (level: LogLevel) => {
    config.level = level
  },
  
  setConfig: (newConfig: Partial<DebugConfig>) => {
    config = { ...config, ...newConfig }
  },
  
  getConfig: () => ({ ...config }),
  
  // Logging methods
  error: (context: string, message: string, data?: any) => {
    log(LogLevel.ERROR, context, message, data)
  },
  
  warn: (context: string, message: string, data?: any) => {
    log(LogLevel.WARN, context, message, data)
  },
  
  info: (context: string, message: string, data?: any) => {
    log(LogLevel.INFO, context, message, data)
  },
  
  debug: (context: string, message: string, data?: any) => {
    log(LogLevel.DEBUG, context, message, data)
  },
  
  trace: (context: string, message: string, data?: any) => {
    log(LogLevel.TRACE, context, message, data)
  },
  
  // Specialized logging
  api: (message: string, data?: any) => {
    log(LogLevel.INFO, 'API', message, data)
  },
  
  auth: (message: string, data?: any) => {
    log(LogLevel.INFO, 'AUTH', message, data)
  },
  
  database: (message: string, data?: any) => {
    log(LogLevel.DEBUG, 'DATABASE', message, data)
  },
  
  file: (message: string, data?: any) => {
    log(LogLevel.DEBUG, 'FILE', message, data)
  },
  
  analysis: (message: string, data?: any) => {
    log(LogLevel.DEBUG, 'ANALYSIS', message, data)
  },
  
  ui: (message: string, data?: any) => {
    log(LogLevel.DEBUG, 'UI', message, data)
  },
  
  performance: (message: string, data?: any) => {
    log(LogLevel.INFO, 'PERFORMANCE', message, data)
  }
} as const

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

const performanceTimers = new Map<string, number>()

export const performance = {
  start: (label: string): void => {
    performanceTimers.set(label, Date.now())
    debug.performance(`Started timer: ${label}`)
  },
  
  end: (label: string): number => {
    const startTime = performanceTimers.get(label)
    if (!startTime) {
      debug.warn('PERFORMANCE', `Timer not found: ${label}`)
      return 0
    }
    
    const duration = Date.now() - startTime
    performanceTimers.delete(label)
    debug.performance(`Timer completed: ${label} (${duration}ms)`)
    return duration
  },
  
  measure: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    performance.start(label)
    try {
      const result = await fn()
      performance.end(label)
      return result
    } catch (error) {
      performance.end(label)
      throw error
    }
  },
  
  measureSync: <T>(label: string, fn: () => T): T => {
    performance.start(label)
    try {
      const result = fn()
      performance.end(label)
      return result
    } catch (error) {
      performance.end(label)
      throw error
    }
  }
} as const

// ============================================================================
// ERROR TRACKING UTILITIES
// ============================================================================

export const errorTracker = {
  track: (error: Error, context: string, additionalData?: any): void => {
    debug.error(context, `Error tracked: ${error.message}`, {
      name: error.name,
      stack: error.stack,
      ...additionalData
    })
  },
  
  trackAsync: async <T>(
    fn: () => Promise<T>,
    context: string,
    additionalData?: any
  ): Promise<T | null> => {
    try {
      return await fn()
    } catch (error) {
      errorTracker.track(error as Error, context, additionalData)
      return null
    }
  },
  
  trackSync: <T>(
    fn: () => T,
    context: string,
    additionalData?: any
  ): T | null => {
    try {
      return fn()
    } catch (error) {
      errorTracker.track(error as Error, context, additionalData)
      return null
    }
  }
} as const

// ============================================================================
// DATA INSPECTION UTILITIES
// ============================================================================

export const inspector = {
  // Safe JSON stringify with circular reference handling
  stringify: (obj: any, space?: number): string => {
    const seen = new WeakSet()
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]'
        }
        seen.add(value)
      }
      return value
    }, space)
  },
  
  // Inspect object properties
  inspect: (obj: any, maxDepth: number = 3): void => {
    debug.debug('INSPECTOR', 'Object inspection:', {
      type: typeof obj,
      constructor: obj?.constructor?.name,
      keys: obj && typeof obj === 'object' ? Object.keys(obj) : undefined,
      stringified: inspector.stringify(obj, 2)
    })
  },
  
  // Inspect function
  inspectFunction: (fn: Function): void => {
    debug.debug('INSPECTOR', 'Function inspection:', {
      name: fn.name,
      length: fn.length,
      toString: fn.toString().substring(0, 200) + '...'
    })
  },
  
  // Memory usage (Node.js only)
  memoryUsage: (): void => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      debug.performance('Memory usage:', {
        rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(usage.external / 1024 / 1024)} MB`
      })
    }
  }
} as const

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

export const dev = {
  // Check if in development mode
  isDev: (): boolean => process.env.NODE_ENV === 'development',
  
  // Check if in production mode
  isProd: (): boolean => process.env.NODE_ENV === 'production',
  
  // Conditional logging (only in development)
  devOnly: (fn: () => void): void => {
    if (dev.isDev()) {
      fn()
    }
  },
  
  // Development warnings
  warn: (message: string, data?: any): void => {
    if (dev.isDev()) {
      debug.warn('DEV', message, data)
    }
  },
  
  // Development info
  info: (message: string, data?: any): void => {
    if (dev.isDev()) {
      debug.info('DEV', message, data)
    }
  }
} as const

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const debugUtils = {
  debug,
  performance,
  errorTracker,
  inspector,
  dev,
  LogLevel
} as const
