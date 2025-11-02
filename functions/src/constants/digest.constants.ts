/**
 * Alert Digest Constants
 * Configuration values for batched alert notification system
 *
 * @module constants/digest.constants
 */

/**
 * Digest collection name in Firestore
 */
export const DIGEST_COLLECTION = "alerts_digests";

/**
 * Cooldown period between digest sends (24 hours in milliseconds)
 */
export const DIGEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Cooldown period in hours (for display purposes)
 */
export const DIGEST_COOLDOWN_HOURS = 24;

/**
 * Maximum send attempts before stopping notifications
 */
export const DIGEST_MAX_ATTEMPTS = 3;

/**
 * Maximum number of alert items per digest
 * Oldest items are removed when this limit is exceeded
 */
export const DIGEST_MAX_ITEMS = 10;

/**
 * Batch size for processing digests in scheduler
 * Prevents timeout on large datasets
 */
export const DIGEST_BATCH_SIZE = 50;

/**
 * Scheduler configuration for sendAlertDigests
 */
export const DIGEST_SCHEDULER_CONFIG = {
  /** Cron schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC) */
  schedule: "0 */6 * * *",

  /** Timezone for consistent cooldown calculations */
  timeZone: "UTC",

  /** Number of retries on function failure */
  retryCount: 2,

  /** Allow cold starts to minimize costs */
  minInstances: 0,
} as const;

/**
 * Error messages for digest operations
 */
export const DIGEST_ERRORS = {
  INVALID_TOKEN: "Invalid or expired acknowledgement token",
  DIGEST_NOT_FOUND: "Digest not found",
  ALREADY_ACKNOWLEDGED: "Digest has already been acknowledged",
  EMAIL_SEND_FAILED: "Failed to send digest email",
  QUERY_FAILED: "Failed to query eligible digests",
  UPDATE_FAILED: "Failed to update digest document",
} as const;

/**
 * Success messages for digest operations
 */
export const DIGEST_MESSAGES = {
  SENT_SUCCESS: "Digest email sent successfully",
  ACKNOWLEDGED: "Digest acknowledged - no further notifications will be sent",
  NO_ELIGIBLE: "No eligible digests to send at this time",
  CYCLE_COMPLETE: "Digest send cycle completed",
} as const;

/**
 * Email template configuration
 */
export const DIGEST_EMAIL_CONFIG = {
  /** From address for digest emails */
  FROM_NAME: "PureTrack Alerts",

  /** Subject line prefix */
  SUBJECT_PREFIX: "⚠️ Alert Digest:",

  /** Frontend base URL for acknowledgement links */
  ACK_BASE_URL: "https://puretrack.app/acknowledge",
} as const;

/**
 * Alert category labels (for email display)
 */
export const DIGEST_CATEGORIES = {
  ph_high: "pH High",
  ph_low: "pH Low",
  tds_high: "TDS High",
  tds_low: "TDS Low",
  turbidity_high: "Turbidity High",
  multi_param: "Multiple Parameters",
} as const;
