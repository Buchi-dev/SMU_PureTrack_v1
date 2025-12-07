/**
 * Device Management Schemas
 * Zod schemas for device-related data validation
 * 
 * @module schemas/deviceManagement
 */

import { z } from 'zod';
import { SENSOR_THRESHOLDS } from '../constants/waterQuality.constants';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Device Status
 * ✅ V2 Backend: 'online' | 'offline'
 */
export const DeviceStatusSchema = z.enum(['online', 'offline']);

/**
 * Device UI Status (computed client-side by deviceStatus.util)
 * Extended status that includes 'warning' state for quality issues
 */
export const DeviceUIStatusSchema = z.enum(['online', 'offline', 'warning']);

/**
 * Device Registration Status  
 * ✅ V2 Backend: 'registered' | 'pending'
 */
export const DeviceRegistrationStatusSchema = z.enum(['registered', 'pending']);

// ============================================================================
// NESTED OBJECT SCHEMAS
// ============================================================================

/**
 * Device Location Schema
 */
export const DeviceLocationSchema = z.object({
  building: z.string().min(1, 'Building is required'),
  floor: z.string().min(1, 'Floor is required'),
  notes: z.string().optional(),
});

/**
 * Device Metadata Schema
 */
export const DeviceMetadataSchema = z.object({
  location: DeviceLocationSchema.optional(),
  description: z.string().optional(),
  owner: z.string().optional(),
}).passthrough(); // Allow additional properties

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

/**
 * Device Document Schema
 * ✅ Matches V2 Backend device.types.ts
 */
export const DeviceSchema = z.object({
  id: z.union([z.string(), z.any()]).optional(), // MongoDB _id (can be ObjectId or string)
  _id: z.any().optional(), // MongoDB _id as ObjectId
  deviceId: z.string(),
  name: z.string(),
  type: z.string(),
  firmwareVersion: z.string(),
  macAddress: z.string(),
  ipAddress: z.string(),
  sensors: z.array(z.string()),
  location: z.string(), // ✅ V2 uses string location, not nested object
  status: DeviceStatusSchema,
  registrationStatus: DeviceRegistrationStatusSchema,
  isRegistered: z.boolean(),
  lastSeen: z.union([z.date(), z.any()]),
  metadata: DeviceMetadataSchema.optional(),
  createdAt: z.union([z.date(), z.any()]),
  updatedAt: z.union([z.date(), z.any()]).optional(),
  // Legacy fields for backwards compatibility
  registeredAt: z.any().optional(),
});

/**
 * Sensor Reading Schema
 * ✅ V2 Backend uses: pH (capital H), turbidity, tds
 * ✅ Uses SENSOR_THRESHOLDS from constants for validation
 * ✅ Includes validity flags for sensor health monitoring
 */
export const SensorReadingSchema = z.object({
  id: z.union([z.string(), z.any()]).optional(),
  _id: z.any().optional(),
  deviceId: z.string(),
  pH: z.number().nullable()
    .refine((val) => val === null || (val >= SENSOR_THRESHOLDS.pH.critical.min && val <= SENSOR_THRESHOLDS.pH.critical.max), 
      `pH must be between ${SENSOR_THRESHOLDS.pH.critical.min} and ${SENSOR_THRESHOLDS.pH.critical.max} or null`),
  turbidity: z.number().nullable()
    .refine((val) => val === null || (val >= 0 && val <= SENSOR_THRESHOLDS.turbidity.critical * 2), 
      'Turbidity must be non-negative and within expected range or null'),
  tds: z.number().nullable()
    .refine((val) => val === null || (val >= 0 && val <= SENSOR_THRESHOLDS.tds.critical * 2), 
      'TDS must be non-negative and within expected range or null'),
  // Sensor validity flags (sent by Arduino)
  pH_valid: z.boolean().optional().default(true),
  tds_valid: z.boolean().optional().default(true),
  turbidity_valid: z.boolean().optional().default(true),
  timestamp: z.union([z.date(), z.any()]),
  createdAt: z.union([z.date(), z.any()]).optional(),
  // Legacy fields for backwards compatibility
  ph: z.number().optional(), // Lowercase for compatibility
  receivedAt: z.number().optional(),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Device Data for Add/Update Operations
 */
export const DeviceDataSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  firmwareVersion: z.string().optional(),
  macAddress: z.string().optional(),
  ipAddress: z.string().optional(),
  sensors: z.array(z.string()).optional(),
  status: DeviceStatusSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Command Parameters Schema
 */
export const CommandParamsSchema = z.record(z.string(), z.any());

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Device Operation Response Schema
 */
export const DeviceResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  device: DeviceSchema.optional(),
  devices: z.array(DeviceSchema).optional(),
  count: z.number().optional(),
  sensorData: SensorReadingSchema.optional(),
  history: z.array(SensorReadingSchema).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;
export type DeviceUIStatus = z.infer<typeof DeviceUIStatusSchema>;
export type DeviceRegistrationStatus = z.infer<typeof DeviceRegistrationStatusSchema>;
export type DeviceLocation = z.infer<typeof DeviceLocationSchema>;
export type DeviceMetadata = z.infer<typeof DeviceMetadataSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type SensorReading = z.infer<typeof SensorReadingSchema>;
export type DeviceData = z.infer<typeof DeviceDataSchema>;
export type CommandParams = z.infer<typeof CommandParamsSchema>;
export type DeviceResponse = z.infer<typeof DeviceResponseSchema>;

// ============================================================================
// EXTENDED TYPES (UI-specific enriched types)
// ============================================================================

/**
 * Command Options for sendDeviceCommand
 */
export interface CommandOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts on failure (default: 3) */
  retryAttempts?: number;
  /** Wait for device acknowledgment before resolving (default: false) */
  waitForAck?: boolean;
}

/**
 * Command Result from sendDeviceCommand
 */
export interface CommandResult {
  /** Whether command was sent successfully to backend */
  success: boolean;
  /** Whether command was queued in MQTT broker */
  queued: boolean;
  /** Whether device acknowledged the command (null if waitForAck=false or still pending) */
  acknowledged: boolean | null;
  /** Error message if command failed */
  error: string | null;
  /** Backend-provided command ID for tracking */
  commandId: string;
  /** Timestamp when command was sent */
  timestamp: number;
  /** Backend device status at time of command */
  deviceStatus?: string;
}

/**
 * Command History Entry (for UI display)
 */
export interface CommandHistoryEntry {
  /** Backend command ID */
  commandId: string;
  /** Command type (restart, send_now, etc.) */
  command: string;
  /** Command status (sending/queued/acknowledged/timeout/failed) */
  status: 'sending' | 'queued' | 'acknowledged' | 'timeout' | 'failed' | 'completed';
  /** Timestamp when command was sent */
  timestamp: number;
  /** Error message if failed */
  error?: string;
  /** Device acknowledgment timestamp (if received) */
  acknowledgedAt?: number;
}

/**
 * Device enriched with severity information and active alerts
 * Used in AdminDeviceReadings and other monitoring pages
 * 
 * ✅ Now includes computed uiStatus from centralized deviceStatus.util
 * 
 * @see AdminDeviceReadings
 * @see useDeviceSeverityCalculator
 * @see utils/deviceStatus.util
 */
export interface DeviceWithReadings extends Device {
  /** Latest sensor reading from RTDB */
  latestReading: SensorReading | null;
  /** Active alerts associated with this device (WaterQualityAlert type) */
  activeAlerts: Array<Record<string, unknown>>; // Using generic type to avoid circular dependency with alerts.schema
  /** Calculated severity score (higher = more critical) */
  severityScore: number;
  /** Severity level based on score and alerts */
  severityLevel: 'critical' | 'warning' | 'normal' | 'offline';
  /** Computed UI status (online/offline/warning) from centralized helper */
  uiStatus?: 'online' | 'offline' | 'warning';
  /** Human-readable status reason */
  statusReason?: string;
  /** Whether device has recent data */
  hasRecentData?: boolean;
  /** Whether sensor readings indicate quality issues */
  hasQualityWarnings?: boolean;
  /** Milliseconds since last activity */
  lastSeenMs?: number | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if device is registered
 * Now uses the isRegistered boolean field from the database
 * Falls back to checking location metadata for legacy devices
 */
export const isDeviceRegistered = (device: Device): boolean => {
  // First check the explicit isRegistered field
  if (device.isRegistered !== undefined) {
    return device.isRegistered;
  }
  
  // Fallback to legacy method - check if location is configured
  return !!(
    device.metadata?.location?.building &&
    device.metadata?.location?.floor
  );
};

/**
 * Get location display string
 */
export const getDeviceLocationString = (device: Device): string => {
  if (!device.metadata?.location) return 'No location set';
  const { building, floor, notes } = device.metadata.location;
  if (!building || !floor) return 'Incomplete location';
  const locationParts = [building, floor];
  if (notes) locationParts.push(`(${notes})`);
  return locationParts.join(', ');
};
