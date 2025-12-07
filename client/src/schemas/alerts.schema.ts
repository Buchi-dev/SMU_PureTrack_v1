/**
 * Alert Management Schemas
 * Zod schemas for alert-related data validation
 * 
 * @module schemas/alerts
 */

import { z } from 'zod';
import { 
  ALERT_SEVERITY, 
  ALERT_STATUS, 
  WATER_QUALITY_PARAMETERS 
} from '../constants/waterQuality.constants';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Water Quality Alert Status
 * ✅ V2 Backend: 'Unacknowledged' | 'Acknowledged' | 'Resolved'
 * Uses constants from waterQuality.constants.ts
 */
export const WaterQualityAlertStatusSchema = z.enum([
  ALERT_STATUS.UNACKNOWLEDGED,
  ALERT_STATUS.ACKNOWLEDGED,
  ALERT_STATUS.RESOLVED
] as const);

/**
 * Water Quality Alert Severity
 * ✅ V2 Backend: 'Critical' | 'Warning' | 'Advisory'
 * Uses constants from waterQuality.constants.ts
 */
export const WaterQualityAlertSeveritySchema = z.enum([
  ALERT_SEVERITY.ADVISORY,
  ALERT_SEVERITY.WARNING,
  ALERT_SEVERITY.CRITICAL
] as const);

/**
 * Water Quality Parameter
 * ✅ V2 Backend: 'pH' | 'Turbidity' | 'TDS' (capitalized)
 * Uses keys from WATER_QUALITY_PARAMETERS
 */
export const WaterQualityParameterSchema = z.enum(['pH', 'Turbidity', 'TDS'] as const);

/**
 * Trend Direction
 */
export const TrendDirectionSchema = z.enum(['increasing', 'decreasing', 'stable']);

/**
 * Water Quality Alert Type
 */
export const WaterQualityAlertTypeSchema = z.enum(['threshold', 'trend']);

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

/**
 * Water Quality Alert Document Schema
 * ✅ Matches V2 Backend alert.types.ts
 * V2 Backend has: value, threshold, parameter (capitalized), status (Unacknowledged/Acknowledged/Resolved)
 */
export const WaterQualityAlertSchema = z.object({
  id: z.union([z.string(), z.any()]).optional(), // MongoDB _id (can be ObjectId or string)
  _id: z.any().optional(), // MongoDB _id as ObjectId
  alertId: z.string(),
  deviceId: z.string(),
  deviceName: z.string(),
  deviceLocation: z.string().optional(), // Device location from devices collection
  severity: WaterQualityAlertSeveritySchema,
  parameter: WaterQualityParameterSchema,
  value: z.number(), // ✅ V2 field name (primary)
  threshold: z.number(), // ✅ V2 field name (not nullable in V2)
  message: z.string(),
  status: WaterQualityAlertStatusSchema,
  acknowledged: z.boolean().optional(), // V2 has this field
  acknowledgedAt: z.union([z.date(), z.any()]).optional().nullable(),
  acknowledgedBy: z.any().optional().nullable(), // Can be ObjectId or populated user
  resolvedAt: z.union([z.date(), z.any()]).optional().nullable(),
  resolvedBy: z.any().optional().nullable(), // Can be ObjectId or populated user
  resolutionNotes: z.string().optional(),
  timestamp: z.union([z.date(), z.any()]),
  occurrenceCount: z.number().optional(),
  firstOccurrence: z.union([z.date(), z.any()]).optional(),
  lastOccurrence: z.union([z.date(), z.any()]).optional(),
  currentValue: z.number().optional(), // Alias for 'value' (for compatibility)
  emailSent: z.boolean().optional(),
  emailSentAt: z.union([z.date(), z.any()]).optional().nullable(),
  createdAt: z.union([z.date(), z.any()]),
  updatedAt: z.union([z.date(), z.any()]).optional(),
  // Legacy fields (removed in V2, kept for backwards compatibility)
  deviceBuilding: z.string().optional(),
  deviceFloor: z.string().optional(),
  alertType: WaterQualityAlertTypeSchema.optional(),
  previousValue: z.number().optional(),
  changeRate: z.number().optional(),
  thresholdValue: z.number().optional(), // Alias for 'threshold'
  trendDirection: TrendDirectionSchema.optional(),
  recommendedAction: z.string().optional(),
  notificationsSent: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Alert Filters Schema
 * Used for filtering alerts in list operations (backend API)
 */
export const AlertFiltersSchema = z.object({
  severity: z.array(WaterQualityAlertSeveritySchema).optional(),
  status: z.array(WaterQualityAlertStatusSchema).optional(),
  parameter: z.array(WaterQualityParameterSchema).optional(),
  deviceId: z.array(z.string()).optional(),
});

/**
 * Extended Alert Filters Schema
 * Used for client-side filtering (includes date range and search)
 */
export const AlertFiltersExtendedSchema = AlertFiltersSchema.extend({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  searchTerm: z.string().optional(),
});

/**
 * Acknowledge Alert Request Schema
 */
export const AcknowledgeAlertRequestSchema = z.object({
  action: z.literal('acknowledgeAlert'),
  alertId: z.string().min(1, 'Alert ID is required'),
});

/**
 * Resolve Alert Request Schema
 */
export const ResolveAlertRequestSchema = z.object({
  action: z.literal('resolveAlert'),
  alertId: z.string().min(1, 'Alert ID is required'),
  notes: z.string().optional(),
});

/**
 * List Alerts Request Schema
 */
export const ListAlertsRequestSchema = z.object({
  action: z.literal('listAlerts'),
  filters: AlertFiltersSchema.optional(),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Alert Operation Response Schema
 */
export const AlertResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  alert: z.object({
    alertId: z.string(),
    status: WaterQualityAlertStatusSchema,
  }).optional(),
  alerts: z.array(WaterQualityAlertSchema).optional(),
  error: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type WaterQualityAlertStatus = z.infer<typeof WaterQualityAlertStatusSchema>;
export type WaterQualityAlertSeverity = z.infer<typeof WaterQualityAlertSeveritySchema>;
export type WaterQualityParameter = z.infer<typeof WaterQualityParameterSchema>;
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;
export type WaterQualityAlertType = z.infer<typeof WaterQualityAlertTypeSchema>;
export type WaterQualityAlert = z.infer<typeof WaterQualityAlertSchema>;
export type AlertFilters = z.infer<typeof AlertFiltersSchema>;
export type AlertFiltersExtended = z.infer<typeof AlertFiltersExtendedSchema>;
export type AcknowledgeAlertRequest = z.infer<typeof AcknowledgeAlertRequestSchema>;
export type ResolveAlertRequest = z.infer<typeof ResolveAlertRequestSchema>;
export type ListAlertsRequest = z.infer<typeof ListAlertsRequestSchema>;
export type AlertResponse = z.infer<typeof AlertResponseSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get display unit for water parameter
 * Uses constants from waterQuality.constants.ts
 */
export const getParameterUnit = (parameter: WaterQualityParameter): string => {
  const paramInfo = WATER_QUALITY_PARAMETERS[parameter];
  return paramInfo?.unit || '';
};

/**
 * Get display name for water parameter
 * Uses constants from waterQuality.constants.ts
 */
export const getParameterName = (parameter: WaterQualityParameter): string => {
  const paramInfo = WATER_QUALITY_PARAMETERS[parameter];
  return paramInfo?.name || parameter;
};

/**
 * Get Ant Design color tag for severity
 * Uses constants from waterQuality.constants.ts
 */
export const getSeverityColor = (severity: WaterQualityAlertSeverity): string => {
  switch (severity) {
    case ALERT_SEVERITY.CRITICAL:
      return 'error';
    case ALERT_SEVERITY.WARNING:
      return 'warning';
    case ALERT_SEVERITY.ADVISORY:
      return 'processing';
    default:
      return 'default';
  }
};

/**
 * Get Ant Design color tag for status
 * ✅ Updated for V2 status values with constants
 */
export const getStatusColor = (status: WaterQualityAlertStatus): string => {
  switch (status) {
    case ALERT_STATUS.UNACKNOWLEDGED:
      return 'error';
    case ALERT_STATUS.ACKNOWLEDGED:
      return 'warning';
    case ALERT_STATUS.RESOLVED:
      return 'success';
    default:
      return 'default';
  }
};

/**
 * Safely format numeric value with fallback
 * Handles undefined, null, Infinity, and NaN
 * 
 * @param value - Numeric value to format
 * @param decimals - Number of decimal places (default: 2)
 * @param fallback - Fallback text (default: 'N/A')
 * @returns Formatted string
 * 
 * @example
 * formatAlertValue(0.78241, 2) // "0.78"
 * formatAlertValue(undefined) // "N/A"
 * formatAlertValue(Infinity) // "N/A"
 */
export const formatAlertValue = (
  value: number | undefined | null,
  decimals: number = 2,
  fallback: string = 'N/A'
): string => {
  if (value == null || !isFinite(value)) {
    return fallback;
  }
  return value.toFixed(decimals);
};
