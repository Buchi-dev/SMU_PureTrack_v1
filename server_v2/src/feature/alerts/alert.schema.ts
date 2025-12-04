/**
 * Alert Validation Schemas
 * Zod schemas for runtime validation with TypeScript type inference
 */

import { z } from 'zod';
import { AlertSeverity, AlertStatus, AlertParameter } from './alert.types';

/**
 * Alert query filters schema
 */
export const alertFiltersSchema = z.object({
  deviceId: z.string().optional(),
  severity: z.nativeEnum(AlertSeverity).optional(),
  status: z.nativeEnum(AlertStatus).optional(),
  parameter: z.nativeEnum(AlertParameter).optional(),
  acknowledged: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  startDate: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
  endDate: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

/**
 * Acknowledge alert schema
 */
export const acknowledgeAlertSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
});

/**
 * Resolve alert schema
 */
export const resolveAlertSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
  body: z.object({
    resolutionNotes: z.string().min(1).max(1000).optional(),
  }),
});

/**
 * Resolve all alerts schema
 */
export const resolveAllAlertsSchema = z.object({
  body: z.object({
    resolutionNotes: z.string().min(1).max(1000).optional(),
    filters: z.object({
      severity: z.nativeEnum(AlertSeverity).optional(),
      parameter: z.nativeEnum(AlertParameter).optional(),
      deviceId: z.string().optional(),
    }).optional(),
  }).optional().default({}),
});

/**
 * Get alert by ID schema
 */
export const getAlertByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
});

/**
 * Delete alert schema
 */
export const deleteAlertSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
});

/**
 * Create alert schema (for manual alert creation if needed)
 */
export const createAlertSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
    deviceName: z.string().min(1, 'Device name is required'),
    severity: z.nativeEnum(AlertSeverity),
    parameter: z.nativeEnum(AlertParameter),
    value: z.number(),
    threshold: z.number(),
    message: z.string().min(1, 'Message is required'),
    timestamp: z.string().datetime().transform((val) => new Date(val)),
  }),
});

/**
 * Alert statistics query schema
 */
export const alertStatisticsSchema = z.object({
  query: z.object({
    deviceId: z.string().optional(),
  }),
});

// Export inferred types for use in controllers
export type AlertFiltersInput = z.infer<typeof alertFiltersSchema>;
export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type ResolveAlertInput = z.infer<typeof resolveAlertSchema>;
export type ResolveAllAlertsInput = z.infer<typeof resolveAllAlertsSchema>;
export type GetAlertByIdInput = z.infer<typeof getAlertByIdSchema>;
export type DeleteAlertInput = z.infer<typeof deleteAlertSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type AlertStatisticsInput = z.infer<typeof alertStatisticsSchema>;
