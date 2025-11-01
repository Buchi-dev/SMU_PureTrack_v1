/**
 * Alert Management Schemas
 * Zod schemas for alert-related data validation
 * 
 * @module schemas/alerts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Water Quality Alert Status
 */
export const WaterQualityAlertStatusSchema = z.enum(['Active', 'Acknowledged', 'Resolved']);

/**
 * Water Quality Alert Severity
 */
export const WaterQualityAlertSeveritySchema = z.enum(['Advisory', 'Warning', 'Critical']);

/**
 * Water Quality Parameter
 */
export const WaterQualityParameterSchema = z.enum(['tds', 'ph', 'turbidity']);

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
 * Represents a water quality alert in Firestore
 * Note: Firestore Timestamp fields are typed as `any` for flexibility
 */
export const WaterQualityAlertSchema = z.object({
  alertId: z.string(),
  deviceId: z.string(),
  deviceName: z.string().optional(),
  deviceBuilding: z.string().optional(),
  deviceFloor: z.string().optional(),
  parameter: WaterQualityParameterSchema,
  alertType: WaterQualityAlertTypeSchema,
  severity: WaterQualityAlertSeveritySchema,
  status: WaterQualityAlertStatusSchema,
  currentValue: z.number(),
  thresholdValue: z.number().optional(),
  trendDirection: TrendDirectionSchema.optional(),
  message: z.string(),
  recommendedAction: z.string(),
  createdAt: z.any(), // Firestore Timestamp
  acknowledgedAt: z.any().optional(), // Firestore Timestamp
  acknowledgedBy: z.string().optional(),
  resolvedAt: z.any().optional(), // Firestore Timestamp
  resolvedBy: z.string().optional(),
  resolutionNotes: z.string().optional(),
  notificationsSent: z.array(z.string()),
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
 */
export const getParameterUnit = (parameter: WaterQualityParameter): string => {
  switch (parameter) {
    case 'tds':
      return 'ppm';
    case 'ph':
      return '';
    case 'turbidity':
      return 'NTU';
    default:
      return '';
  }
};

/**
 * Get display name for water parameter
 */
export const getParameterName = (parameter: WaterQualityParameter): string => {
  switch (parameter) {
    case 'tds':
      return 'TDS (Total Dissolved Solids)';
    case 'ph':
      return 'pH Level';
    case 'turbidity':
      return 'Turbidity';
    default:
      return parameter;
  }
};

/**
 * Get Ant Design color tag for severity
 */
export const getSeverityColor = (severity: WaterQualityAlertSeverity): string => {
  switch (severity) {
    case 'Critical':
      return 'error';
    case 'Warning':
      return 'warning';
    case 'Advisory':
      return 'processing';
    default:
      return 'default';
  }
};

/**
 * Get Ant Design color tag for status
 */
export const getStatusColor = (status: WaterQualityAlertStatus): string => {
  switch (status) {
    case 'Active':
      return 'error';
    case 'Acknowledged':
      return 'warning';
    case 'Resolved':
      return 'success';
    default:
      return 'default';
  }
};
