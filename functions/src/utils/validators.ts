// Input validation utilities

/**
 * Validate device ID format
 * @param {string} deviceId - Device ID to validate
 * @return {boolean} True if valid
 */
export function isValidDeviceId(deviceId: string): boolean {
  return /^[A-Z0-9_-]+$/i.test(deviceId);
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @return {boolean} True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate sensor reading values
 * @param {object} reading - Sensor reading object
 * @return {boolean} True if valid
 */
export function isValidSensorReading(reading: {
  turbidity?: number;
  tds?: number;
  ph?: number;
}): boolean {
  if (reading.turbidity !== undefined && (reading.turbidity < 0 || reading.turbidity > 1000)) {
    return false;
  }
  if (reading.tds !== undefined && (reading.tds < 0 || reading.tds > 10000)) {
    return false;
  }
  if (reading.ph !== undefined && (reading.ph < 0 || reading.ph > 14)) {
    return false;
  }
  return true;
}
