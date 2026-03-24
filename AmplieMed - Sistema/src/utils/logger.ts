/**
 * Structured logging system for consistent, filterable logs across the application.
 * All logs follow a consistent format for easy integration with monitoring services.
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Determines if a log level should be output based on current environment.
 * Production: INFO, WARN, ERROR
 * Development: DEBUG, INFO, WARN, ERROR
 */
const shouldLog = (level: LogLevel): boolean => {
  const isDev = process.env.NODE_ENV === 'development';
  const levels = isDev 
    ? ['DEBUG', 'INFO', 'WARN', 'ERROR']
    : ['INFO', 'WARN', 'ERROR'];
  return levels.includes(level);
};

/**
 * Formats error objects into serializable structure
 */
const formatError = (err: unknown) => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return {
    name: 'Unknown',
    message: String(err),
  };
};

/**
 * Core logging function
 */
const log = (level: LogLevel, message: string, context?: any, error?: Error) => {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(error && { error: formatError(error) }),
  };

  // Always output to console in structured format
  const logFn = {
    DEBUG: console.debug,
    INFO: console.info,
    WARN: console.warn,
    ERROR: console.error,
  }[level];

  logFn(JSON.stringify(entry));

  // TODO: Send to monitoring service (Sentry, LogRocket, etc)
  // if (level === 'ERROR' && process.env.NODE_ENV === 'production') {
  //   sendToMonitoringService(entry);
  // }
};

/**
 * Public logger API
 */
export const logger = {
  /**
   * Debug-level logs - only in development
   */
  debug: (message: string, context?: any) => {
    log('DEBUG', message, context);
  },

  /**
   * Info-level logs - development and production
   */
  info: (message: string, context?: any) => {
    log('INFO', message, context);
  },

  /**
   * Warning-level logs - for non-critical issues
   */
  warn: (message: string, context?: any) => {
    log('WARN', message, context);
  },

  /**
   * Error-level logs - for critical issues
   */
  error: (message: string, error?: Error | unknown, context?: any) => {
    const err = error instanceof Error ? error : undefined;
    log('ERROR', message, context, err);
  },
};

export type { LogEntry };
