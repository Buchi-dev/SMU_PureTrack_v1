/**
 * Alert Configuration
 * Defines cooldown periods for alert generation
 * 
 * STATUS:
 * - ALERT_COOLDOWN: ✅ IMPLEMENTED (used in middleware/alertCooldown.js)
 * - Other features: ⚠️ NOT YET IMPLEMENTED (commented out for future use)
 */

module.exports = {
  // ============================================
  // ✅ IMPLEMENTED FEATURES
  // ============================================
  
  // Alert cooldown periods (in minutes) - how long to wait before creating new alert for same parameter
  ALERT_COOLDOWN: {
    Critical: 60,      // 1 hour - don't create new critical alert for same parameter
    Warning: 120,      // 2 hours
    Advisory: 240      // 4 hours
  },

  // ============================================
  // ⚠️ FUTURE FEATURES (Not yet implemented)
  // ============================================
  
  // TODO: Implement email throttling to prevent spam
  // Tracks max emails per device per hour
  // MAX_EMAILS_PER_DEVICE_HOUR: 3,

  // TODO: Implement alert deduplication settings
  // Prevents duplicate alerts for same issue
  // DEDUPLICATION: {
  //   enabled: true,
  //   checkUnacknowledgedOnly: true,  // Only deduplicate unacknowledged alerts
  //   updateExistingAlert: true,      // Update occurrence count instead of creating new
  //   checkWithinCooldown: true,      // Check for alerts within cooldown period
  // },

  // TODO: Implement email throttling system
  // Prevents email spam at system level
  // EMAIL_THROTTLE: {
  //   enabled: true,
  //   maxPerHour: 50,           // Total system-wide emails per hour
  //   maxPerRecipient: 10,      // Per recipient per hour
  //   burstProtection: true,    // Stop sending if 5 failures in 1 minute
  // },

  // TODO: Implement auto-resolution
  // Handles automatic alert closure
  // RESOLUTION: {
  //   autoResolveOnNormal: false,  // Don't auto-resolve when values return to normal
  //   requireManualAck: true,     // Require manual acknowledgment
  // }
};