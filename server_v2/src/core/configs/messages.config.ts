/**
 * Centralized Error Messages
 * All error messages in one place for consistency and easy maintenance
 */

export const ERROR_MESSAGES = {
  // Authentication & Authorization
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid credentials provided',
    TOKEN_EXPIRED: 'Authentication token has expired',
    TOKEN_INVALID: 'Invalid authentication token',
    TOKEN_MISSING: 'Authentication token is required',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action',
    USER_NOT_FOUND: 'User not found',
    USER_SUSPENDED: 'User account has been suspended',
    USER_PENDING: 'User account is pending approval',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access to this resource is forbidden',
  },

  // Validation
  VALIDATION: {
    FAILED: 'Validation failed',
    MISSING_REQUIRED_FIELD: (field: string) => `Required field missing: ${field}`,
    INVALID_FORMAT: (field: string) => `Invalid format for field: ${field}`,
    OUT_OF_RANGE: (field: string, min: number, max: number) =>
      `${field} must be between ${min} and ${max}`,
    INVALID_EMAIL: 'Invalid email address format',
    INVALID_PHONE: 'Invalid phone number format',
    INVALID_DATE: 'Invalid date format',
    INVALID_ID: 'Invalid ID format',
    INVALID_OBJECT_ID: (field: string) => `Invalid MongoDB ObjectId format for ${field}`,
    INVALID_ENUM: (field: string, values: string[]) =>
      `${field} must be one of: ${values.join(', ')}`,
  },

  // Resources
  RESOURCE: {
    NOT_FOUND: (resource: string) => `${resource} not found`,
    ALREADY_EXISTS: (resource: string) => `${resource} already exists`,
    CONFLICT: (resource: string) => `Conflict with existing ${resource}`,
    DELETED: (resource: string) => `${resource} has been deleted`,
    IN_USE: (resource: string) => `${resource} is currently in use`,
  },

  // Resources (alternative naming for consistency)
  RESOURCES: {
    NOT_FOUND: (resource: string, id: string) => `${resource} with ID ${id} not found`,
    ALREADY_EXISTS: (resource: string) => `${resource} already exists`,
    CONFLICT: (resource: string) => `Conflict with existing ${resource}`,
  },

  // Database
  DATABASE: {
    CONNECTION_FAILED: 'Failed to connect to database',
    QUERY_FAILED: 'Database query failed',
    TRANSACTION_FAILED: 'Database transaction failed',
    TIMEOUT: 'Database operation timed out',
    DUPLICATE_KEY: 'Duplicate key error',
  },

  // Devices
  DEVICE: {
    NOT_FOUND: 'Device not found',
    ALREADY_REGISTERED: 'Device is already registered',
    NOT_REGISTERED: 'Device is not registered',
    OFFLINE: 'Device is currently offline',
    INVALID_ID: 'Invalid device ID format',
    REGISTRATION_FAILED: 'Device registration failed',
    COMMAND_FAILED: 'Failed to send command to device',
    INVALID_SENSOR_DATA: 'Invalid sensor data format',
  },

  // Alerts
  ALERT: {
    NOT_FOUND: (id: string) => `Alert with ID ${id} not found`,
    ALREADY_ACKNOWLEDGED: (id: string) => `Alert ${id} has already been acknowledged`,
    ALREADY_RESOLVED: (id: string) => `Alert ${id} has already been resolved`,
    CANNOT_RESOLVE_UNACKNOWLEDGED: 'Cannot resolve unacknowledged alert',
    INVALID_SEVERITY: 'Invalid alert severity level',
    INVALID_STATUS: 'Invalid alert status',
    COOLDOWN_ACTIVE: (minutes: number) => `Alert cooldown period is active. ${minutes} minutes remaining`,
    CREATION_FAILED: 'Failed to create alert',
  },

  // Reports
  REPORT: {
    NOT_FOUND: 'Report not found',
    GENERATION_FAILED: 'Report generation failed',
    GENERATION_IN_PROGRESS: 'Report generation is already in progress',
    INVALID_DATE_RANGE: 'Invalid date range for report',
    NO_DATA_AVAILABLE: 'No data available for the specified period',
    FILE_TOO_LARGE: 'Report file size exceeds maximum limit',
    DOWNLOAD_FAILED: 'Report download failed',
  },

  // Users
  USER: {
    NOT_FOUND: 'User not found',
    ALREADY_EXISTS: 'User already exists',
    INVALID_ROLE: 'Invalid user role',
    INVALID_STATUS: 'Invalid user status',
    CANNOT_CHANGE_OWN_ROLE: 'Cannot change your own role',
  },

  // MQTT
  MQTT: {
    CONNECTION_FAILED: 'Failed to connect to MQTT broker',
    PUBLISH_FAILED: 'Failed to publish MQTT message',
    SUBSCRIBE_FAILED: 'Failed to subscribe to MQTT topic',
    DISCONNECTED: 'MQTT client is disconnected',
    INVALID_TOPIC: 'Invalid MQTT topic format',
    INVALID_MESSAGE: 'Invalid MQTT message format',
  },

  // External Services
  EXTERNAL: {
    SERVICE_UNAVAILABLE: 'External service is unavailable',
    SERVICE_TIMEOUT: 'External service request timed out',
    INVALID_RESPONSE: 'Invalid response from external service',
    API_ERROR: 'External API error',
  },

  // Rate Limiting
  RATE_LIMIT: {
    EXCEEDED: 'Rate limit exceeded. Please try again later',
    TOO_MANY_REQUESTS: 'Too many requests. Please slow down',
  },

  // File Operations
  FILE: {
    TOO_LARGE: 'File size exceeds maximum limit',
    UPLOAD_FAILED: 'File upload failed',
    NOT_FOUND: 'File not found',
    INVALID_FORMAT: 'Invalid file format',
    DOWNLOAD_FAILED: 'File download failed',
  },

  // General
  GENERAL: {
    INTERNAL_ERROR: 'An internal server error occurred',
    NOT_IMPLEMENTED: 'This feature is not yet implemented',
    BAD_REQUEST: 'Bad request',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    TIMEOUT: 'Request timed out',
    UNKNOWN_ERROR: 'An unknown error occurred',
  },

  // Pagination
  PAGINATION: {
    INVALID_PAGE: 'Invalid page number',
    INVALID_LIMIT: 'Invalid limit value',
    LIMIT_EXCEEDED: (max: number) => `Limit exceeds maximum allowed value of ${max}`,
  },

  // Sensor Data
  SENSOR: {
    INVALID_PARAMETER: 'Invalid sensor parameter',
    INVALID_VALUE: 'Invalid sensor value',
    OUT_OF_RANGE: (parameter: string) => `${parameter} value is out of acceptable range`,
    NO_DATA: 'No sensor data available',
    READING_FAILED: 'Failed to read sensor data',
  },
} as const;

/**
 * Success messages for consistent responses
 */
export const SUCCESS_MESSAGES = {
  // Authentication
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    TOKEN_REFRESHED: 'Authentication token refreshed',
  },

  // Resources
  RESOURCE: {
    CREATED: (resource: string) => `${resource} created successfully`,
    UPDATED: (resource: string) => `${resource} updated successfully`,
    DELETED: (resource: string) => `${resource} deleted successfully`,
    RETRIEVED: (resource: string) => `${resource} retrieved successfully`,
  },

  // Devices
  DEVICE: {
    REGISTERED: 'Device registered successfully',
    UPDATED: 'Device updated successfully',
    DELETED: 'Device deleted successfully',
    COMMAND_SENT: 'Command sent to device successfully',
    STATUS_UPDATED: 'Device status updated successfully',
  },

  // Alerts
  ALERT: {
    ACKNOWLEDGED: (id: string) => `Alert ${id} acknowledged successfully`,
    RESOLVED: (id: string) => `Alert ${id} resolved successfully`,
    CREATED: (id: string) => `Alert ${id} created successfully`,
    DELETED: (id: string) => `Alert ${id} deleted successfully`,
  },

  // Reports
  REPORT: {
    GENERATED: 'Report generated successfully',
    DOWNLOADED: 'Report downloaded successfully',
    DELETED: 'Report deleted successfully',
  },

  // Users
  USER: {
    CREATED: 'User created successfully',
    UPDATED: 'User updated successfully',
    STATUS_UPDATED: 'User status updated successfully',
  },

  // General
  GENERAL: {
    SUCCESS: 'Operation completed successfully',
    DATA_RETRIEVED: 'Data retrieved successfully',
    NO_CHANGES: 'No changes were made',
  },
} as const;

/**
 * Log messages for consistent logging
 */
export const LOG_MESSAGES = {
  // Server
  SERVER: {
    STARTING: 'Starting server...',
    STARTED: (port: number) => `Server started successfully on port ${port}`,
    STOPPING: 'Stopping server...',
    STOPPED: 'Server stopped successfully',
  },

  // Database
  DATABASE: {
    CONNECTING: 'Connecting to database...',
    CONNECTED: 'Database connected successfully',
    DISCONNECTING: 'Disconnecting from database...',
    DISCONNECTED: 'Database disconnected successfully',
    CONNECTION_ERROR: 'Database connection error',
  },

  // MQTT
  MQTT: {
    CONNECTING: 'Connecting to MQTT broker...',
    CONNECTED: 'MQTT broker connected successfully',
    DISCONNECTING: 'Disconnecting from MQTT broker...',
    DISCONNECTED: 'MQTT broker disconnected successfully',
    RECONNECTING: (attempt: number) => `Reconnecting to MQTT broker (attempt ${attempt})...`,
    MESSAGE_RECEIVED: (topic: string) => `MQTT message received on topic: ${topic}`,
    MESSAGE_PUBLISHED: (topic: string) => `MQTT message published to topic: ${topic}`,
  },

  // Requests
  REQUEST: {
    RECEIVED: (method: string, path: string) => `${method} ${path}`,
    COMPLETED: (method: string, path: string, statusCode: number, duration: number) =>
      `${method} ${path} - ${statusCode} [${duration}ms]`,
  },

  // Background Jobs
  JOB: {
    STARTED: (jobName: string) => `Background job started: ${jobName}`,
    COMPLETED: (jobName: string) => `Background job completed: ${jobName}`,
    FAILED: (jobName: string) => `Background job failed: ${jobName}`,
  },

  // Alerts
  ALERT: {
    THRESHOLD_CHECK_FAILED: (deviceId: string, error: string) =>
      `Threshold check failed for device ${deviceId}: ${error}`,
    CREATED: (alertId: string, severity: string, parameter: string) =>
      `${severity} alert created for ${parameter}: ${alertId}`,
    UPDATED: (alertId: string) => `Alert ${alertId} updated with new occurrence`,
    COOLDOWN_ACTIVE: (alertId: string, minutes: number) =>
      `Alert cooldown active for ${alertId}. ${minutes} minutes remaining`,
  },

  // Email
  EMAIL: {
    QUEUED: (alertId: string) => `Email notification queued for alert: ${alertId}`,
    SENT: (alertId: string) => `Email notification sent for alert: ${alertId}`,
    SEND_FAILED: (error: string) => `Failed to send email notification: ${error}`,
    BATCH_SENT: (count: number) => `Batch of ${count} email notifications sent`,
  },
} as const;

export default {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  LOG_MESSAGES,
};
