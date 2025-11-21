const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add correlation ID to each request
 * Helps with distributed tracing and log aggregation
 * 
 * The correlation ID can be:
 * 1. Provided by the client in X-Correlation-ID header
 * 2. Generated automatically if not provided
 * 
 * The ID is:
 * - Attached to req.correlationId for use in controllers
 * - Returned in response header X-Correlation-ID
 * - Can be logged for request tracking
 */
const addCorrelationId = (req, res, next) => {
  // Use existing correlation ID from client or generate new one
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // Add to response headers for client tracking
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Add request start time for performance tracking
  req.startTime = Date.now();
  
  // Log request completion with correlation ID
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    
    // This will be picked up by the logger if available
    if (global.logger) {
      global.logger.info('Request completed', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
  });
  
  next();
};

/**
 * Middleware to extract user information for logging
 * Should be used after authentication middleware
 */
const addUserContext = (req, res, next) => {
  if (req.user) {
    req.userContext = {
      userId: req.user._id,
      email: req.user.email,
      role: req.user.role,
    };
  }
  next();
};

module.exports = {
  addCorrelationId,
  addUserContext,
};
