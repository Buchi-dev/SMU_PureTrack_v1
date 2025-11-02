/**
 * Validation Utilities
 * Reusable validation functions for input validation across all modules
 *
 * @module utils/validators
 *
 * Purpose: Centralize validation logic to ensure consistent input validation
 * and prevent duplicate validation code across callable/pubsub functions
 */

/**
 * Validate device ID format
 *
 * Rules:
 * - Must contain only alphanumeric characters, underscores, or hyphens
 * - Case-insensitive matching
 * - Used by: deviceManagement, processSensorData, autoRegisterDevice
 *
 * @param {string} deviceId - Device ID to validate
 * @return {boolean} True if device ID matches format requirements
 *
 * @example
 * isValidDeviceId('DEVICE_123')      // true
 * isValidDeviceId('device-abc-456')  // true
 * isValidDeviceId('device@invalid')  // false
 * isValidDeviceId('')                // false
 */
export function isValidDeviceId(deviceId: string): boolean {
  if (!deviceId || typeof deviceId !== "string") {
    return false;
  }
  return /^[A-Z0-9_-]+$/i.test(deviceId);
}

/**
 * Validate email format
 *
 * Rules:
 * - Must follow standard email format: local@domain.tld
 * - Simple regex validation (not RFC 5322 compliant, but sufficient for most cases)
 * - Used by: userManagement, notificationPreferences
 *
 * @param {string} email - Email address to validate
 * @return {boolean} True if email matches basic format requirements
 *
 * @example
 * isValidEmail('user@example.com')       // true
 * isValidEmail('user.name@domain.co.uk') // true
 * isValidEmail('invalid.email')          // false
 * isValidEmail('user@')                  // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate sensor reading values
 *
 * Rules:
 * - Turbidity: 0-1000 NTU (Nephelometric Turbidity Units)
 * - TDS: 0-10000 ppm (Total Dissolved Solids in parts per million)
 * - pH: 0-14 (standard pH scale)
 * - All values must be non-negative numbers
 * - Used by: processSensorData, deviceManagement
 *
 * @param {string} reading - Sensor reading object with optional parameters
 * @return {boolean} True if all provided sensor values are within acceptable ranges
 *
 * @example
 * isValidSensorReading({ turbidity: 5.2, tds: 250, ph: 7.0 })  // true
 * isValidSensorReading({ turbidity: -1 })                       // false (negative)
 * isValidSensorReading({ ph: 15 })                              // false (exceeds max)
 * isValidSensorReading({ tds: 5000 })                           // true
 */
export function isValidSensorReading(reading: {
  turbidity?: number;
  tds?: number;
  ph?: number;
}): boolean {
  if (!reading || typeof reading !== "object") {
    return false;
  }

  // Validate turbidity: 0-1000 NTU
  if (reading.turbidity !== undefined) {
    if (
      typeof reading.turbidity !== "number" ||
      reading.turbidity < 0 ||
      reading.turbidity > 1000
    ) {
      return false;
    }
  }

  // Validate TDS: 0-10000 ppm
  if (reading.tds !== undefined) {
    if (typeof reading.tds !== "number" || reading.tds < 0 || reading.tds > 10000) {
      return false;
    }
  }

  // Validate pH: 0-14
  if (reading.ph !== undefined) {
    if (typeof reading.ph !== "number" || reading.ph < 0 || reading.ph > 14) {
      return false;
    }
  }

  return true;
}

/**
 * Validate alert severity level
 *
 * Rules:
 * - Must be one of: "Advisory", "Warning", "Critical"
 * - Case-sensitive validation
 * - Used by: alertManagement, processSensorData
 *
 * @param {string} severity - Severity string to validate
 * @return {boolean} True if severity is a valid alert level
 *
 * @example
 * isValidAlertSeverity('Critical')  // true
 * isValidAlertSeverity('Warning')   // true
 * isValidAlertSeverity('critical')  // false (wrong case)
 * isValidAlertSeverity('High')      // false (invalid level)
 */
export function isValidAlertSeverity(severity: string): boolean {
  const validSeverities = ["Advisory", "Warning", "Critical"];
  return validSeverities.includes(severity);
}

/**
 * Validate water parameter type
 *
 * Rules:
 * - Must be one of: "tds", "ph", "turbidity"
 * - Case-sensitive validation
 * - Used by: alertManagement, processSensorData, reportGeneration
 *
 * @param {string} parameter - Parameter string to validate
 * @return {boolean} True if parameter is a valid water quality metric
 *
 * @example
 * isValidWaterParameter('tds')        // true
 * isValidWaterParameter('ph')         // true
 * isValidWaterParameter('TDS')        // false (wrong case)
 * isValidWaterParameter('temperature') // false (not supported)
 */
export function isValidWaterParameter(parameter: string): boolean {
  const validParameters = ["tds", "ph", "turbidity"];
  return validParameters.includes(parameter);
}

/**
 * Validate alert status
 *
 * Rules:
 * - Must be one of: "Active", "Acknowledged", "Resolved"
 * - Case-sensitive validation
 * - Used by: alertManagement
 *
 * @param {string} status - Status string to validate
 * @return {boolean} True if status is a valid alert state
 *
 * @example
 * isValidAlertStatus('Active')        // true
 * isValidAlertStatus('Resolved')      // true
 * isValidAlertStatus('active')        // false (wrong case)
 * isValidAlertStatus('Pending')       // false (invalid status)
 */
export function isValidAlertStatus(status: string): boolean {
  const validStatuses = ["Active", "Acknowledged", "Resolved"];
  return validStatuses.includes(status);
}

/**
 * Validate timestamp
 *
 * Rules:
 * - Must be a positive number
 * - Must be a valid Unix timestamp (in milliseconds)
 * - Must be within reasonable range (not too far in past or future)
 * - Used by: processSensorData, reportGeneration
 *
 * @param {string} timestamp - Timestamp in milliseconds since epoch
 * @return {boolean} True if timestamp is valid and within reasonable range
 *
 * @example
 * isValidTimestamp(Date.now())           // true
 * isValidTimestamp(1699999999000)        // true
 * isValidTimestamp(-1)                   // false (negative)
 * isValidTimestamp(999999999999999)      // false (too far in future)
 */
export function isValidTimestamp(timestamp: number): boolean {
  if (typeof timestamp !== "number" || timestamp < 0) {
    return false;
  }

  // Reasonable range: after year 2000 and before year 2100
  const minTimestamp = 946684800000; // Jan 1, 2000
  const maxTimestamp = 4102444800000; // Jan 1, 2100

  return timestamp >= minTimestamp && timestamp <= maxTimestamp;
}

/**
 * Validate acknowledgement token format
 *
 * Rules:
 * - Must be a 64-character hexadecimal string (32 bytes)
 * - Case-insensitive matching
 * - Used by: acknowledgeDigest, aggregateAlertsToDigest
 *
 * @param {string} token - Acknowledgement token to validate
 * @return {boolean} True if token matches the expected format
 *
 * @example
 * isValidAckToken('a1b2c3d4...') // true (if 64 hex chars)
 * isValidAckToken('invalid')     // false (too short)
 * isValidAckToken('xyz123...')   // false (non-hex characters)
 */
export function isValidAckToken(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }
  // 64 hex characters (32 bytes)
  return /^[a-f0-9]{64}$/i.test(token);
}
