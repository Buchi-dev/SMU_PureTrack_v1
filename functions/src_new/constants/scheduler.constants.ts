/**
 * Scheduler Constants
 * Constants for scheduled functions (stale alert monitoring, etc.)
 *
 * @module constants/scheduler
 */

/**
 * Stale alert threshold in milliseconds
 * Alerts older than this are considered stale
 */
export const STALE_ALERT_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Stale alert threshold in hours (for display)
 */
export const STALE_ALERT_THRESHOLD_HOURS = 2;

/**
 * Scheduler error messages
 */
export const SCHEDULER_ERRORS = {
  FETCH_ALERTS_FAILED: "Failed to fetch stale alerts from database",
  FETCH_PREFERENCES_FAILED: "Failed to fetch notification preferences",
  FETCH_USERS_FAILED: "Failed to fetch user data",
  FETCH_DEVICES_FAILED: "Failed to fetch device data",
  EMAIL_SEND_FAILED: "Failed to send stale alert email notification",
} as const;

/**
 * Scheduler success messages
 */
export const SCHEDULER_MESSAGES = {
  NO_STALE_ALERTS: "No stale critical alerts found",
  STALE_ALERTS_DETECTED: "Stale critical alerts detected and notifications sent",
  EMAIL_SENT: "Stale alert notification email sent successfully",
  ANALYTICS_SENT: "Analytics report sent successfully",
  NO_RECIPIENTS: "No users configured for scheduled analytics",
  ANALYTICS_COMPLETE: "Analytics report generation completed",
} as const;

/**
 * Scheduler configuration
 */
export const SCHEDULER_CONFIG = {
  TIMEZONE: "Asia/Manila",
  RETRY_COUNT: 3,
  STALE_ALERT_SCHEDULE: "every 1 hours",
  DAILY_ANALYTICS_SCHEDULE: "0 6 * * *", // Every day at 6:00 AM Manila time
  WEEKLY_ANALYTICS_SCHEDULE: "0 7 * * 1", // Every Monday at 7:00 AM Manila time
  MONTHLY_ANALYTICS_SCHEDULE: "0 8 1 * *", // 1st of month at 8:00 AM Manila time
} as const;

/**
 * Analytics report periods (in milliseconds)
 */
export const ANALYTICS_PERIODS = {
  DAILY: 24 * 60 * 60 * 1000, // 24 hours
  WEEKLY: 7 * 24 * 60 * 60 * 1000, // 7 days
  MONTHLY: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;
