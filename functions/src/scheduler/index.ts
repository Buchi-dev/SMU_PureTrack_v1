/**
 * Scheduler Functions Module
 * Exports all scheduled Cloud Functions
 *
 * @module scheduler
 */

// Export offline device checker (runs every 5 minutes)
export { checkOfflineDevices } from "./checkOfflineDevices";

// Export stale alerts checker (runs every 1 hour)
export { checkStaleAlerts } from "./checkStaleAlerts";

// Export alert digest sender (runs every 6 hours)
export { sendAlertDigests } from "./sendAlertDigests";

// Export analytics schedulers (respect sendScheduledAlerts preference)
export { sendDailyAnalytics } from "./sendDailyAnalytics"; // Every day at 6:00 AM Manila
export { sendWeeklyAnalytics } from "./sendWeeklyAnalytics"; // Every Monday at 7:00 AM Manila
export { sendMonthlyAnalytics } from "./sendMonthlyAnalytics"; // 1st of month at 8:00 AM Manila
