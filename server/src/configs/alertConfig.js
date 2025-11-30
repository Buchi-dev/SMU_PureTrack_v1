/**
 * Alert Configuration
 * Defines cooldown periods, deduplication settings, and email throttling
 */

module.exports = {
  // Alert cooldown periods (in minutes) - how long to wait before creating new alert for same parameter
  ALERT_COOLDOWN: {
    Critical: 60,      // 1 hour - don't create new critical alert for same parameter
    Warning: 120,      // 2 hours
    Advisory: 240      // 4 hours
  },

  // Max emails per device per hour
  MAX_EMAILS_PER_DEVICE_HOUR: 3,

  // Alert deduplication settings
  DEDUPLICATION: {
    enabled: true,
    checkUnacknowledgedOnly: true,  // Only deduplicate unacknowledged alerts
    updateExistingAlert: true,      // Update occurrence count instead of creating new
    checkWithinCooldown: true,      // Check for alerts within cooldown period
  },

  // Email throttling to prevent spam
  EMAIL_THROTTLE: {
    enabled: true,
    maxPerHour: 50,           // Total system-wide emails per hour
    maxPerRecipient: 10,      // Per recipient per hour
    burstProtection: true,    // Stop sending if 5 failures in 1 minute
  },

  // Alert resolution settings
  RESOLUTION: {
    autoResolveOnNormal: false,  // Don't auto-resolve when values return to normal
    requireManualAck: true,     // Require manual acknowledgment
  }
};