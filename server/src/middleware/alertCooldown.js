const Alert = require('../alerts/alert.Model');
const config = require('../configs/alertConfig');

/**
 * Check if an alert can be created based on cooldown period
 * @param {string} deviceId - Device ID
 * @param {string} parameter - Parameter name (pH, turbidity, TDS)
 * @param {string} severity - Alert severity (Critical, Warning, Advisory)
 * @returns {Object} - { canCreateAlert: boolean, existingAlertId?: string, minutesRemaining?: number, message?: string }
 */
async function checkAlertCooldown(deviceId, parameter, severity) {
  const cooldownMinutes = config.ALERT_COOLDOWN[severity] || 60;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  // Find active alert within cooldown period
  const activeAlert = await Alert.findOne({
    deviceId,
    parameter,
    acknowledged: false,  // Only check unacknowledged alerts
    createdAt: { $gte: new Date(Date.now() - cooldownMs) }
  }).sort({ createdAt: -1 }); // Get most recent

  if (activeAlert) {
    // Calculate time remaining
    const timeElapsed = Date.now() - activeAlert.createdAt.getTime();
    const timeRemaining = cooldownMs - timeElapsed;
    const minutesRemaining = Math.ceil(timeRemaining / 60000);

    return {
      canCreateAlert: false,
      existingAlertId: activeAlert._id,
      minutesRemaining,
      message: `Alert cooldown active. ${minutesRemaining} minutes remaining.`,
      activeAlert
    };
  }

  return { canCreateAlert: true };
}

/**
 * Update existing alert with new occurrence
 * @param {Object} existingAlert - Existing alert document
 * @param {number} currentValue - Current sensor value
 * @param {Date} timestamp - Current timestamp
 * @returns {Object} - Updated alert
 */
async function updateAlertOccurrence(existingAlert, currentValue, timestamp) {
  existingAlert.lastOccurrence = timestamp || new Date();
  existingAlert.occurrenceCount = (existingAlert.occurrenceCount || 1) + 1;
  existingAlert.currentValue = currentValue;
  existingAlert.updatedAt = new Date();

  await existingAlert.save();
  return existingAlert;
}

module.exports = {
  checkAlertCooldown,
  updateAlertOccurrence
};