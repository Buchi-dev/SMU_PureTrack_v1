/**
 * Device Command Constants
 * MQTT command configuration and types for IoT device control
 * Matches V2 backend command handling
 */

/**
 * Device Command Types
 * Commands sent to devices via MQTT broker
 */
export const DEVICE_COMMANDS = {
  SEND_NOW: 'send_now',      // Trigger immediate sensor reading
  RESTART: 'restart',         // Reboot device
  GO: 'go',                   // Resume normal operation
  WAIT: 'wait',               // Pause operation
  DEREGISTER: 'deregister',   // Remove device from system
  CALIBRATE: 'calibrate',     // Calibrate sensors (if supported)
} as const;

/**
 * Command Display Names (user-facing)
 */
export const COMMAND_LABELS = {
  [DEVICE_COMMANDS.SEND_NOW]: 'Send Reading Now',
  [DEVICE_COMMANDS.RESTART]: 'Restart Device',
  [DEVICE_COMMANDS.GO]: 'Resume Operation',
  [DEVICE_COMMANDS.WAIT]: 'Pause Operation',
  [DEVICE_COMMANDS.DEREGISTER]: 'Deregister Device',
  [DEVICE_COMMANDS.CALIBRATE]: 'Calibrate Sensors',
} as const;

/**
 * Command Descriptions (user-facing)
 */
export const COMMAND_DESCRIPTIONS = {
  [DEVICE_COMMANDS.SEND_NOW]: 'Request device to send sensor readings immediately',
  [DEVICE_COMMANDS.RESTART]: 'Reboot the device (may take 30-60 seconds)',
  [DEVICE_COMMANDS.GO]: 'Resume normal sensor reading operations',
  [DEVICE_COMMANDS.WAIT]: 'Temporarily pause sensor reading operations',
  [DEVICE_COMMANDS.DEREGISTER]: 'Remove device from system and stop data collection',
  [DEVICE_COMMANDS.CALIBRATE]: 'Recalibrate sensor readings to factory defaults',
} as const;

/**
 * Command Execution Configuration
 */
export const COMMAND_CONFIG = {
  // Default timeout for command acknowledgment (milliseconds)
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  
  // Short timeout for quick commands
  SHORT_TIMEOUT: 10000, // 10 seconds
  
  // Long timeout for restart/calibration
  LONG_TIMEOUT: 90000, // 90 seconds (1.5 minutes)
  
  // Default retry attempts on failure
  DEFAULT_RETRIES: 3,
  
  // Delay between retry attempts (milliseconds)
  RETRY_DELAY: 5000, // 5 seconds
  
  // Maximum command history to display
  MAX_HISTORY: 10,
} as const;

/**
 * Command-specific timeout configuration
 */
export const COMMAND_TIMEOUTS: Record<string, number> = {
  [DEVICE_COMMANDS.SEND_NOW]: COMMAND_CONFIG.SHORT_TIMEOUT,
  [DEVICE_COMMANDS.RESTART]: COMMAND_CONFIG.LONG_TIMEOUT,
  [DEVICE_COMMANDS.GO]: COMMAND_CONFIG.SHORT_TIMEOUT,
  [DEVICE_COMMANDS.WAIT]: COMMAND_CONFIG.SHORT_TIMEOUT,
  [DEVICE_COMMANDS.DEREGISTER]: COMMAND_CONFIG.DEFAULT_TIMEOUT,
  [DEVICE_COMMANDS.CALIBRATE]: COMMAND_CONFIG.LONG_TIMEOUT,
};

/**
 * Command Status States
 */
export const COMMAND_STATUS = {
  SENDING: 'sending',           // Command being sent to backend
  QUEUED: 'queued',             // Queued in MQTT broker
  ACKNOWLEDGED: 'acknowledged',  // Device acknowledged receipt
  TIMEOUT: 'timeout',           // No acknowledgment within timeout
  FAILED: 'failed',             // Command failed to send/execute
  COMPLETED: 'completed',       // Command executed successfully
} as const;

/**
 * Command Status Display Labels
 */
export const COMMAND_STATUS_LABELS = {
  [COMMAND_STATUS.SENDING]: 'Sending...',
  [COMMAND_STATUS.QUEUED]: 'Queued',
  [COMMAND_STATUS.ACKNOWLEDGED]: 'Acknowledged',
  [COMMAND_STATUS.TIMEOUT]: 'Timed Out',
  [COMMAND_STATUS.FAILED]: 'Failed',
  [COMMAND_STATUS.COMPLETED]: 'Completed',
} as const;

/**
 * Command Status Colors (Ant Design)
 */
export const COMMAND_STATUS_COLORS = {
  [COMMAND_STATUS.SENDING]: 'processing',
  [COMMAND_STATUS.QUEUED]: 'default',
  [COMMAND_STATUS.ACKNOWLEDGED]: 'success',
  [COMMAND_STATUS.TIMEOUT]: 'warning',
  [COMMAND_STATUS.FAILED]: 'error',
  [COMMAND_STATUS.COMPLETED]: 'success',
} as const;

export type DeviceCommand = typeof DEVICE_COMMANDS[keyof typeof DEVICE_COMMANDS];
export type CommandStatus = typeof COMMAND_STATUS[keyof typeof COMMAND_STATUS];
