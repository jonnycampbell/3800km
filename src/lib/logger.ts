export interface LogContext {
  [key: string]: unknown
}

export interface LogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  message: string
  context?: LogContext
  component?: string
  userId?: string
  requestId?: string
  environment: string
}

class Logger {
  private environment: string
  private isDevelopment: boolean

  constructor() {
    this.environment = process.env.NODE_ENV || 'development'
    this.isDevelopment = this.environment === 'development'
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, component, userId, requestId } = entry
    
    const parts = [
      `[${timestamp}]`,
      `[${level}]`,
      component && `[${component}]`,
      userId && `[user:${userId}]`,
      requestId && `[req:${requestId}]`,
      message
    ].filter(Boolean)

    let logString = parts.join(' ')
    
    if (context && Object.keys(context).length > 0) {
      logString += ` | Context: ${JSON.stringify(this.sanitizeContext(context))}`
    }
    
    return logString
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context }
    
    // Remove sensitive data in production
    if (!this.isDevelopment) {
      const sensitiveKeys = [
        'token', 'password', 'secret', 'key', 'auth', 'authorization',
        'access_token', 'refresh_token', 'client_secret', 'client_id'
      ]
      
      for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]'
        }
      }
    }
    
    return sanitized
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: LogContext,
    component?: string,
    userId?: string,
    requestId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      component,
      userId,
      requestId,
      environment: this.environment
    }
  }

  debug(message: string, context?: LogContext, component?: string, userId?: string, requestId?: string) {
    const entry = this.createLogEntry('DEBUG', message, context, component, userId, requestId)
    if (this.isDevelopment) {
      console.debug(this.formatLogEntry(entry))
    }
  }

  info(message: string, context?: LogContext, component?: string, userId?: string, requestId?: string) {
    const entry = this.createLogEntry('INFO', message, context, component, userId, requestId)
    console.info(this.formatLogEntry(entry))
  }

  warn(message: string, context?: LogContext, component?: string, userId?: string, requestId?: string) {
    const entry = this.createLogEntry('WARN', message, context, component, userId, requestId)
    console.warn(this.formatLogEntry(entry))
  }

  error(message: string, error?: Error | unknown, context?: LogContext, component?: string, userId?: string, requestId?: string) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : error
    }
    
    const entry = this.createLogEntry('ERROR', message, errorContext, component, userId, requestId)
    console.error(this.formatLogEntry(entry))
  }

  // Performance logging
  time(label: string, component?: string) {
    const startLabel = `${component ? `${component}:` : ''}${label}`
    console.time(startLabel)
    return {
      end: () => {
        console.timeEnd(startLabel)
        this.info(`Performance: ${label} completed`, undefined, component)
      }
    }
  }

  // Request logging helpers
  logRequest(method: string, url: string, context?: LogContext, component?: string, requestId?: string) {
    this.info(`${method} ${url}`, context, component, undefined, requestId)
  }

  logResponse(method: string, url: string, status: number, duration?: number, context?: LogContext, component?: string, requestId?: string) {
    const responseContext = {
      ...context,
      status,
      duration: duration ? `${duration}ms` : undefined
    }
    this.info(`${method} ${url} -> ${status}`, responseContext, component, undefined, requestId)
  }

  // Environment validation logging
  validateEnvironment(requiredVars: string[], component?: string) {
    const missing = requiredVars.filter(varName => !process.env[varName])
    
    if (missing.length > 0) {
      this.error('Missing required environment variables', undefined, {
        missing,
        environment: this.environment
      }, component)
      return false
    }
    
    this.info('Environment validation passed', {
      checkedVars: requiredVars.length,
      environment: this.environment
    }, component)
    return true
  }
}

export const logger = new Logger()

// Request ID generator for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Middleware to add request ID to headers
export function withRequestId<T extends Response>(response: T, requestId?: string): T {
  if (requestId) {
    response.headers.set('X-Request-ID', requestId)
  }
  return response
} 