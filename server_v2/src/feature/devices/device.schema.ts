/**
 * Device Validation Schemas
 * Zod schemas for runtime validation with TypeScript type inference
 */

import { z } from 'zod';
import { DeviceStatus, DeviceRegistrationStatus } from './device.types';

/**
 * Device query filters schema
 */
export const deviceFiltersSchema = z.object({
  status: z.nativeEnum(DeviceStatus).optional(),
  registrationStatus: z.nativeEnum(DeviceRegistrationStatus).optional(),
  isRegistered: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

/**
 * Register device schema
 */
export const registerDeviceSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
    name: z.string().optional(),
    type: z.string().optional(),
    firmwareVersion: z.string().optional(),
    macAddress: z.string().optional(),
    ipAddress: z.string().optional(),
    sensors: z.array(z.string()).optional(),
    location: z.string().optional(),
    metadata: z.object({
      location: z.object({
        building: z.string().optional(),
        floor: z.string().optional(),
        notes: z.string().optional(),
      }).optional(),
      firmware: z.string().optional(),
      hardware: z.string().optional(),
      ipAddress: z.string().optional(),
    }).optional(),
  }),
});

/**
 * Update device schema
 * Accepts either MongoDB ObjectId or deviceId
 */
export const updateDeviceSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Device ID is required'),
  }),
  body: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    firmwareVersion: z.string().optional(),
    macAddress: z.string().optional(),
    ipAddress: z.string().optional(),
    sensors: z.array(z.string()).optional(),
    location: z.string().optional(),
    status: z.nativeEnum(DeviceStatus).optional(),
    registrationStatus: z.nativeEnum(DeviceRegistrationStatus).optional(),
    metadata: z.object({
      location: z.object({
        building: z.string().optional(),
        floor: z.string().optional(),
        notes: z.string().optional(),
      }).optional(),
      firmware: z.string().optional(),
      hardware: z.string().optional(),
      ipAddress: z.string().optional(),
    }).optional(),
  }),
});

/**
 * Approve device registration schema
 */
export const approveDeviceSchema = z.object({
  params: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
  }),
  body: z.object({
    location: z.string().optional(),
    metadata: z.object({
      location: z.object({
        building: z.string().optional(),
        floor: z.string().optional(),
        notes: z.string().optional(),
      }).optional(),
      firmware: z.string().optional(),
      hardware: z.string().optional(),
      ipAddress: z.string().optional(),
    }).optional(),
  }),
});

/**
 * Update device status schema
 */
export const updateDeviceStatusSchema = z.object({
  params: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
  }),
  body: z.object({
    status: z.nativeEnum(DeviceStatus),
  }),
});

/**
 * Send command schema
 */
export const sendCommandSchema = z.object({
  params: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
  }),
  body: z.object({
    command: z.string().min(1, 'Command is required'),
    payload: z.any().optional(),
    data: z.any().optional(), // Alias for payload (frontend compatibility)
  }).transform((body) => ({
    command: body.command,
    // Use 'data' if provided, otherwise use 'payload'
    payload: body.data !== undefined ? body.data : body.payload,
  })),
});

/**
 * Get device by ID schema
 * Accepts either MongoDB ObjectId or deviceId
 */
export const getDeviceByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Device ID is required'),
  }),
});

/**
 * Delete device schema
 * Accepts either MongoDB ObjectId or deviceId
 */
export const deleteDeviceSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Device ID is required'),
  }),
});

// Export inferred types
export type DeviceFiltersInput = z.infer<typeof deviceFiltersSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type ApproveDeviceInput = z.infer<typeof approveDeviceSchema>;
export type UpdateDeviceStatusInput = z.infer<typeof updateDeviceStatusSchema>;
export type SendCommandInput = z.infer<typeof sendCommandSchema>;
export type GetDeviceByIdInput = z.infer<typeof getDeviceByIdSchema>;
export type DeleteDeviceInput = z.infer<typeof deleteDeviceSchema>;
