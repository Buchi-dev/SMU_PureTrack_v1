/**
 * Application Constants
 * Centralized configuration to eliminate magic numbers and duplicate strings
 * All values are readonly to prevent accidental modifications
 */

/**
 * Time constants in milliseconds
 */
export const TIME = {
  ONE_SECOND: 1000,
  FIVE_SECONDS: 5 * 1000,
  TEN_SECONDS: 10 * 1000,
  THIRTY_SECONDS: 30 * 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  TWO_HOURS: 2 * 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  NINETY_DAYS: 90 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Water quality sensor thresholds based on WHO/EPA guidelines
 */
export const SENSOR_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
    critical: {
      min: 6.0,
      max: 9.0,
    },
    ideal: 7.0,
  },
  turbidity: {
    warning: 5, // NTU (Nephelometric Turbidity Units)
    critical: 10, // NTU
    ideal: 1, // NTU
  },
  tds: {
    warning: 500, // ppm (parts per million)
    critical: 1000, // ppm
    ideal: 300, // ppm
  },
} as const;

/**
 * Pagination configuration
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  READINGS_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  // Success (2xx)
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client Error (4xx)
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

  // Server Error (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * MongoDB connection pool configuration
 * Optimized for MongoDB Atlas cloud deployment
 */
export const MONGO_POOL = {
  MIN_POOL_SIZE: 5, // Maintain minimum connections for immediate availability
  MAX_POOL_SIZE: 10, // Limit max connections to prevent overwhelming the database
  SERVER_SELECTION_TIMEOUT: 30000, // 30 seconds for cloud latency
  SOCKET_TIMEOUT: 60000, // 60 seconds for long-running queries
  CONNECT_TIMEOUT: 30000, // 30 seconds for initial connection
} as const;

/**
 * Email configuration
 */
export const EMAIL = {
  BATCH_SIZE: 10, // Send emails in batches to avoid overwhelming SMTP server
  RETRY_ATTEMPTS: 3, // Retry failed emails
  RETRY_DELAY: TIME.FIVE_MINUTES, // Wait before retrying
  COOLDOWN_PERIOD: TIME.FIVE_MINUTES, // Prevent alert email spam
} as const;

/**
 * Alert configuration
 */
export const ALERT = {
  COOLDOWN: {
    Critical: 5, // 5 minutes for critical alerts
    Warning: 15, // 15 minutes for warning alerts
    Advisory: 30, // 30 minutes for advisory alerts
  },
  DEFAULT_COOLDOWN: 15, // Default cooldown in minutes
  DEDUPLICATION_WINDOW: TIME.ONE_HOUR, // Time window for grouping similar alerts
  MAX_OCCURRENCE_COUNT: 100, // Maximum tracked occurrences before creating new alert
} as const;

/**
 * Device configuration
 */
export const DEVICE = {
  HEARTBEAT_INTERVAL: TIME.THIRTY_SECONDS, // Expected device heartbeat frequency
  OFFLINE_THRESHOLD: 2 * TIME.ONE_MINUTE, // Mark device offline after 2 minutes
  REGISTRATION_TIMEOUT: TIME.FIVE_MINUTES, // Timeout for pending registrations
  PRESENCE_QUERY_TIMEOUT: TIME.TEN_SECONDS, // Wait time for presence responses
} as const;

/**
 * Report configuration
 */
export const REPORT = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB limit for PDF reports
  RETENTION_PERIOD: TIME.NINETY_DAYS, // Auto-delete reports after 90 days
  PROCESSING_TIMEOUT: TIME.FIVE_MINUTES, // Maximum time for report generation
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
  WINDOW_MS: TIME.FIFTEEN_MINUTES, // Rate limit time window
  MAX_REQUESTS: 100, // Maximum requests per window
  SENSOR_DATA_WINDOW_MS: TIME.ONE_MINUTE, // Sensor data rate limit window
  SENSOR_DATA_MAX_REQUESTS: 60, // Max sensor readings per minute per device
} as const;

/**
 * Session configuration
 */
export const SESSION = {
  MAX_AGE: TIME.ONE_DAY, // Session expires after 24 hours
  CHECK_PERIOD: TIME.ONE_HOUR, // Check for expired sessions every hour
  SECRET_LENGTH: 32, // Length of session secret
} as const;

/**
 * API versioning
 */
export const API_VERSION = {
  CURRENT: 'v2',
  PREFIX: '/api/v2',
  DEPRECATED: ['v1'],
} as const;

/**
 * Sensor parameter types
 */
export const SENSOR_PARAMETERS = {
  PH: 'pH',
  TURBIDITY: 'Turbidity',
  TDS: 'TDS',
} as const;

/**
 * Alert severity levels
 */
export const ALERT_SEVERITY = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  ADVISORY: 'Advisory',
} as const;

/**
 * Alert status types
 */
export const ALERT_STATUS = {
  UNACKNOWLEDGED: 'Unacknowledged',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

/**
 * User status types
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const;

/**
 * Device status types
 */
export const DEVICE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
} as const;

/**
 * Device registration status
 */
export const DEVICE_REGISTRATION_STATUS = {
  REGISTERED: 'registered',
  PENDING: 'pending',
} as const;

/**
 * Report types
 */
export const REPORT_TYPES = {
  WATER_QUALITY: 'water-quality',
  DEVICE_STATUS: 'device-status',
  COMPLIANCE: 'compliance',
} as const;

/**
 * Report status
 */
export const REPORT_STATUS = {
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

/**
 * Authentication providers
 */
export const AUTH_PROVIDERS = {
  GOOGLE: 'google',
  FIREBASE: 'firebase',
  LOCAL: 'local',
} as const;

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_USER_SUSPENDED: 'AUTH_USER_SUSPENDED',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_REQUIRED_FIELD: 'VALIDATION_MISSING_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Database
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',

  // MQTT
  MQTT_CONNECTION_FAILED: 'MQTT_CONNECTION_FAILED',
  MQTT_PUBLISH_FAILED: 'MQTT_PUBLISH_FAILED',
  MQTT_SUBSCRIBE_FAILED: 'MQTT_SUBSCRIBE_FAILED',

  // External Services
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_TIMEOUT: 'EXTERNAL_SERVICE_TIMEOUT',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // File Operations
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',

  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const;

/**
 * Logging levels
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
} as const;

/**
 * Collection names for MongoDB
 */
export const COLLECTIONS = {
  USERS: 'users',
  DEVICES: 'devices',
  ALERTS: 'alerts',
  REPORTS: 'reports',
  SENSOR_READINGS: 'sensorreadings',
  BACKUPS: 'backups',
} as const;

export default {
  TIME,
  SENSOR_THRESHOLDS,
  PAGINATION,
  HTTP_STATUS,
  MONGO_POOL,
  EMAIL,
  ALERT,
  DEVICE,
  REPORT,
  RATE_LIMIT,
  SESSION,
  API_VERSION,
  SENSOR_PARAMETERS,
  ALERT_SEVERITY,
  ALERT_STATUS,
  USER_ROLES,
  USER_STATUS,
  DEVICE_STATUS,
  DEVICE_REGISTRATION_STATUS,
  REPORT_TYPES,
  REPORT_STATUS,
  AUTH_PROVIDERS,
  ERROR_CODES,
  LOG_LEVELS,
  COLLECTIONS,
};
