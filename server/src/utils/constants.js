/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 */

// Time constants (in milliseconds)
const TIME = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  NINETY_DAYS: 90 * 24 * 60 * 60 * 1000,
};

// Sensor thresholds (WHO/EPA Guidelines)
const SENSOR_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
    critical: {
      min: 6.0,
      max: 9.0,
    },
  },
  turbidity: {
    warning: 5, // NTU
    critical: 10, // NTU
  },
  tds: {
    warning: 500, // ppm
    critical: 1000, // ppm
  },
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  READINGS_LIMIT: 100,
};

// Session configuration
const SESSION = {
  MAX_AGE: TIME.ONE_DAY,
  CHECK_PERIOD: TIME.ONE_HOUR,
};

// HTTP Status Codes
const HTTP_STATUS = {
  // Success Codes (2xx)
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client Error Codes (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Error Codes (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// Email configuration
const EMAIL = {
  FROM_NAME: process.env.SMTP_FROM_NAME || 'Water Quality Monitor',
  BATCH_SIZE: 10, // Send emails in batches
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: TIME.FIVE_MINUTES,
};

// MongoDB connection pool (optimized for MongoDB Atlas cloud)
const MONGO_POOL = {
  MIN_POOL_SIZE: 5,
  MAX_POOL_SIZE: 10,
  SERVER_SELECTION_TIMEOUT: 30000,  // 30 seconds for cloud MongoDB Atlas
  SOCKET_TIMEOUT: 60000,             // 60 seconds for long-running queries
};

// API versioning
const API_VERSION = {
  CURRENT: 'v1',
  PREFIX: '/api/v1',
};

module.exports = {
  TIME,
  SENSOR_THRESHOLDS,
  PAGINATION,
  SESSION,
  HTTP_STATUS,
  EMAIL,
  MONGO_POOL,
  API_VERSION,
};
