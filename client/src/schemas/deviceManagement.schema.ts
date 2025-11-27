/**
 * Device Management Schemas
 * Zod schemas for device-related data validation
 * 
 * @module schemas/deviceManagement
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Device Status
 */
export const DeviceStatusSchema = z.enum(['online', 'offline', 'error', 'maintenance']);

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
 * Represents a device in Firestore
 */
export const DeviceSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  name: z.string(),
  type: z.string(),
  firmwareVersion: z.string(),
  macAddress: z.string(),
  ipAddress: z.string(),
  sensors: z.array(z.string()),
  status: DeviceStatusSchema,
  registrationStatus: z.enum(['registered', 'pending']).optional(),
  isRegistered: z.boolean().optional(),
  registeredAt: z.any(), // Firebase Timestamp
  lastSeen: z.any(), // Firebase Timestamp
  metadata: DeviceMetadataSchema.optional(),
});

/**
 * Sensor Reading Schema
 */
export const SensorReadingSchema = z.object({
  deviceId: z.string(),
  turbidity: z.number().min(0),
  tds: z.number().min(0),
  ph: z.number().min(0).max(14),
  timestamp: z.number(),
  receivedAt: z.number(),
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
 * Device enriched with severity information and active alerts
 * Used in AdminDeviceReadings and other monitoring pages
 * 
 * @see AdminDeviceReadings
 * @see useDeviceSeverityCalculator
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
