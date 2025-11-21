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
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
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

// Alert severity levels
const ALERT_SEVERITY = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  ADVISORY: 'Advisory',
};

// Alert status
const ALERT_STATUS = {
  UNACKNOWLEDGED: 'Unacknowledged',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
};

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
};

// User status
const USER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
};

// Device status
const DEVICE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};

// Device registration status
const DEVICE_REGISTRATION = {
  REGISTERED: 'registered',
  PENDING: 'pending',
};

// Report types
const REPORT_TYPES = {
  WATER_QUALITY: 'water-quality',
  DEVICE_STATUS: 'device-status',
  COMPLIANCE: 'compliance',
};

// Report status
const REPORT_STATUS = {
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  READINGS_LIMIT: 100,
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  DEVICES: 300, // 5 minutes
  USERS: 600, // 10 minutes
  ALERTS: 60, // 1 minute
  SUMMARY: 120, // 2 minutes
  REPORTS: 3600, // 1 hour
};

// Rate limiting
const RATE_LIMITS = {
  API: {
    windowMs: TIME.FIFTEEN_MINUTES,
    max: 100,
  },
  AUTH: {
    windowMs: TIME.FIFTEEN_MINUTES,
    max: 5,
  },
  SENSOR_DATA: {
    windowMs: TIME.FIFTEEN_MINUTES,
    max: 1000,
  },
  REPORT: {
    windowMs: TIME.ONE_HOUR,
    max: 10,
  },
};

// Session configuration
const SESSION = {
  MAX_AGE: TIME.ONE_DAY,
  CHECK_PERIOD: TIME.ONE_HOUR,
};

// Background job schedules (cron expressions)
const CRON_SCHEDULES = {
  CHECK_OFFLINE_DEVICES: '*/5 * * * *', // Every 5 minutes
  CLEANUP_OLD_READINGS: '0 2 * * *', // Daily at 2:00 AM
  GENERATE_WEEKLY_REPORTS: '0 8 * * 1', // Every Monday at 8:00 AM
};

// Device offline threshold
const DEVICE_OFFLINE_THRESHOLD = TIME.FIVE_MINUTES;

// Data retention period
const DATA_RETENTION = {
  SENSOR_READINGS: TIME.NINETY_DAYS,
  LOGS: 30 * TIME.ONE_DAY, // 30 days
};

// Alert deduplication window
const ALERT_DEDUP_WINDOW = TIME.ONE_HOUR;

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

// MongoDB connection pool
const MONGO_POOL = {
  MIN_POOL_SIZE: 5,
  MAX_POOL_SIZE: 10,
  SERVER_SELECTION_TIMEOUT: 5000,
  SOCKET_TIMEOUT: 45000,
};

// API versioning
const API_VERSION = {
  CURRENT: 'v1',
  PREFIX: '/api/v1',
};

module.exports = {
  TIME,
  SENSOR_THRESHOLDS,
  ALERT_SEVERITY,
  ALERT_STATUS,
  USER_ROLES,
  USER_STATUS,
  DEVICE_STATUS,
  DEVICE_REGISTRATION,
  REPORT_TYPES,
  REPORT_STATUS,
  PAGINATION,
  CACHE_TTL,
  RATE_LIMITS,
  SESSION,
  CRON_SCHEDULES,
  DEVICE_OFFLINE_THRESHOLD,
  DATA_RETENTION,
  ALERT_DEDUP_WINDOW,
  HTTP_STATUS,
  EMAIL,
  MONGO_POOL,
  API_VERSION,
};
