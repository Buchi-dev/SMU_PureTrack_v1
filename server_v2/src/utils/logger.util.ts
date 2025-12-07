/**
 * Winston Logger Utility
 * Production-grade logging with daily rotation and 14-day retention
 * Logs to files: error.log, combined.log
 * Console output in development only
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format with timestamp, level, and message
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Include stack traces for errors
  winston.format.json()
);

/**
 * Console format with colors for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    // Filter out 'service' and empty fields from metadata
    let metaStr = '';
    const cleanMeta = Object.fromEntries(
      Object.entries(meta).filter(([key, v]) => 
        key !== 'service' && v !== undefined && v !== null && v !== ''
      )
    );
    
    if (Object.keys(cleanMeta).length > 0) {
      metaStr = ` ${JSON.stringify(cleanMeta)}`;
    }
    
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * Daily rotate transport configuration
 */
const dailyRotateFileConfig = {
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // Keep logs for 14 days
  zippedArchive: true, // Compress old logs
  format: logFormat,
};

/**
 * Error log transport - Only logs errors
 */
const errorFileTransport = new DailyRotateFile({
  ...dailyRotateFileConfig,
  filename: path.join(logsDir, 'error-%DATE%.log'),
  level: 'error',
});

/**
 * Combined log transport - All log levels
 */
const combinedFileTransport = new DailyRotateFile({
  ...dailyRotateFileConfig,
  filename: path.join(logsDir, 'combined-%DATE%.log'),
});

/**
 * Console transport - Development only
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'http'), // Changed to 'http' in dev
});

/**
 * Winston Logger Instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'http', // Changed default from 'info' to 'http' to show HTTP requests
  format: logFormat,
  defaultMeta: { service: 'water-quality-api' },
  transports: [
    errorFileTransport,
    combinedFileTransport,
    // Console transport only in non-production or when explicitly enabled
    ...(process.env.NODE_ENV !== 'production' || process.env.CONSOLE_LOGS === 'true'
      ? [consoleTransport]
      : []),
  ],
  // Prevent logger from exiting on uncaught exceptions
  exitOnError: false,
});

/**
 * Handle uncaught exceptions
 */
logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(logsDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    zippedArchive: true,
    format: logFormat,
  })
);

/**
 * Handle unhandled promise rejections
 */
logger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(logsDir, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    zippedArchive: true,
    format: logFormat,
  })
);

/**
 * Log stream for Morgan HTTP logger
 * Allows Morgan to write to Winston
 */
export const logStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Helper: Log error with stack trace
 */
export const logError = (message: string, error?: Error | unknown, meta?: object): void => {
  if (error instanceof Error) {
    logger.error(message, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...meta,
    });
  } else {
    logger.error(message, { error, ...meta });
  }
};

/**
 * Helper: Log info message
 */
export const logInfo = (message: string, meta?: object): void => {
  logger.info(message, meta);
};

/**
 * Helper: Log warning message
 */
export const logWarn = (message: string, meta?: object): void => {
  logger.warn(message, meta);
};

/**
 * Helper: Log debug message
 */
export const logDebug = (message: string, meta?: object): void => {
  logger.debug(message, meta);
};

/**
 * Helper: Log HTTP request
 */
export const logHttp = (message: string, meta?: object): void => {
  logger.http(message, meta);
};

/**
 * Initialize logger
 * Called during app startup
 */
export const initializeLogger = (): void => {
  logInfo('✅ Winston Logger: Initialized successfully', {
    environment: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL || 'info',
    logsDirectory: logsDir,
  });
};

// Export logger instance as default
export default logger;
