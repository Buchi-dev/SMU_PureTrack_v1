const logger = require('../utils/logger');
const { AppError } = require('./index');
const { HTTP_STATUS } = require('../utils/constants');
const ERROR_CODES = require('./errorCodes');

/**
 * Global Error Handler Middleware
 * Handles all errors in the application and sends appropriate responses
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = err.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal server error';
  let metadata = err.metadata || {};

  // Handle specific error types
  
  // MongoDB Validation Errors
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.DATABASE_VALIDATION_FAILED;
    message = 'Database validation failed';
    metadata.errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  }

  // MongoDB Cast Errors (Invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_INVALID_FORMAT;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // MongoDB Duplicate Key Errors
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    errorCode = ERROR_CODES.RESOURCE_ALREADY_EXISTS;
    const field = Object.keys(err.keyPattern)[0];
    message = `A resource with this ${field} already exists`;
    metadata.field = field;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.AUTH_TOKEN_INVALID;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.AUTH_TOKEN_EXPIRED;
    message = 'Authentication token has expired';
  }

  // Firebase Auth Errors
  if (err.code && err.code.startsWith('auth/')) {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.FIREBASE_ERROR;
    
    switch (err.code) {
      case 'auth/id-token-expired':
        errorCode = ERROR_CODES.AUTH_TOKEN_EXPIRED;
        message = 'Token has expired';
        break;
      case 'auth/argument-error':
        errorCode = ERROR_CODES.AUTH_TOKEN_INVALID;
        message = 'Invalid token format';
        break;
      case 'auth/user-not-found':
        errorCode = ERROR_CODES.AUTH_USER_NOT_FOUND;
        message = 'User not found';
        break;
      default:
        message = 'Authentication failed';
    }
  }

  // Log error details
  const errorLog = {
    errorCode,
    message,
    statusCode,
    correlationId: req.correlationId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id,
    userRole: req.user?.role,
  };

  // Log based on severity
  if (err.isOperational === false || statusCode >= 500) {
    // Programming errors or server errors - log full stack
    logger.error('Server Error:', {
      ...errorLog,
      stack: err.stack,
      isOperational: err.isOperational,
    });
  } else {
    // Operational errors - log without stack
    logger.warn('Operational Error:', errorLog);
  }

  // Prepare response
  const response = {
    success: false,
    errorCode,
    message,
    correlationId: req.correlationId,
  };

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    response.metadata = metadata;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  // Send response
  res.status(statusCode).json(response);
};

/**
 * Handle 404 Not Found Errors
 * Middleware to catch requests to non-existent routes
 */
const notFoundHandler = (req, res, next) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    correlationId: req.correlationId,
    ip: req.ip,
  });

  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    errorCode: ERROR_CODES.RESOURCE_NOT_FOUND,
    message: 'Route not found',
    path: req.path,
    correlationId: req.correlationId,
  });
};

/**
 * Handle Unhandled Promise Rejections
 * Global handler for unhandled promise rejections
 */
const unhandledRejectionHandler = (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise,
  });
  
  // Don't exit process in production - let PM2 handle it
  if (process.env.NODE_ENV !== 'production') {
    throw reason;
  }
};

/**
 * Handle Uncaught Exceptions
 * Global handler for uncaught exceptions
 */
const uncaughtExceptionHandler = (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  
  // Exit process - application is in undefined state
  process.exit(1);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
};
