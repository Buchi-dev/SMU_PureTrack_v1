const winston = require('winston');
const path = require('path');

/**
 * Winston Logger Configuration
 * Provides structured logging with multiple transports
 */

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (correlationId) {
      msg += ` | CorrelationID: ${correlationId}`;
    }
    
    if (Object.keys(meta).length > 0) {
      msg += ` | ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// Create transports array
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    level: process.env.LOG_LEVEL || 'info',
  })
);

// File transports (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Add request logging helper
logger.logRequest = (req, level = 'info', message = 'Request processed') => {
  logger[level](message, {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?._id,
    userRole: req.user?.role,
  });
};

// Add error logging helper
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

// Make logger globally available
global.logger = logger;

module.exports = logger;
