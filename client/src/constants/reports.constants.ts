/**
 * Reports Constants
 * 
 * Centralized constants for report types, statuses, colors, and labels.
 * Used across report generation, display, and filtering components.
 * 
 * @module constants/reports
 */

// ============================================================================
// REPORT TYPES
// ============================================================================

/**
 * Available report types in the system
 */
export const REPORT_TYPES = {
  WATER_QUALITY: 'water-quality',
  DEVICE_STATUS: 'device-status',
  COMPLIANCE: 'compliance',
  ALERT_SUMMARY: 'alert-summary',
} as const;

/**
 * User-facing display names for report types
 */
export const REPORT_TYPE_LABELS: Record<string, string> = {
  [REPORT_TYPES.WATER_QUALITY]: 'Water Quality',
  [REPORT_TYPES.DEVICE_STATUS]: 'Device Status',
  [REPORT_TYPES.COMPLIANCE]: 'Compliance',
  [REPORT_TYPES.ALERT_SUMMARY]: 'Alert Summary',
} as const;

/**
 * Descriptions for report types (used in tooltips)
 */
export const REPORT_TYPE_DESCRIPTIONS: Record<string, string> = {
  [REPORT_TYPES.WATER_QUALITY]: 'Comprehensive analysis of water quality metrics (pH, TDS, turbidity) over time',
  [REPORT_TYPES.DEVICE_STATUS]: 'Device health, uptime, and connectivity status across monitored locations',
  [REPORT_TYPES.COMPLIANCE]: 'Regulatory compliance assessment against water quality standards',
  [REPORT_TYPES.ALERT_SUMMARY]: 'Summary of triggered alerts, response times, and resolution status',
} as const;

/**
 * Ant Design colors for report type badges/tags
 */
export const REPORT_TYPE_COLORS: Record<string, string> = {
  [REPORT_TYPES.WATER_QUALITY]: 'blue',
  [REPORT_TYPES.DEVICE_STATUS]: 'green',
  [REPORT_TYPES.COMPLIANCE]: 'orange',
  [REPORT_TYPES.ALERT_SUMMARY]: 'red',
} as const;

// ============================================================================
// REPORT STATUS
// ============================================================================

/**
 * Report generation and lifecycle statuses
 */
export const REPORT_STATUS = {
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

/**
 * User-facing display names for report statuses
 */
export const REPORT_STATUS_LABELS: Record<string, string> = {
  [REPORT_STATUS.GENERATING]: 'Generating',
  [REPORT_STATUS.COMPLETED]: 'Completed',
  [REPORT_STATUS.FAILED]: 'Failed',
  [REPORT_STATUS.EXPIRED]: 'Expired',
} as const;

/**
 * Ant Design colors for report status badges
 * - processing: blue animated
 * - success: green
 * - error: red
 * - default: gray
 */
export const REPORT_STATUS_COLORS: Record<string, string> = {
  [REPORT_STATUS.GENERATING]: 'processing',
  [REPORT_STATUS.COMPLETED]: 'success',
  [REPORT_STATUS.FAILED]: 'error',
  [REPORT_STATUS.EXPIRED]: 'default',
} as const;

// ============================================================================
// REPORT FILE FORMATS
// ============================================================================

/**
 * Supported report export formats
 */
export const REPORT_FORMATS = {
  PDF: 'pdf',
  CSV: 'csv',
  EXCEL: 'excel',
  JSON: 'json',
} as const;

/**
 * MIME types for report formats
 */
export const REPORT_MIME_TYPES: Record<string, string> = {
  [REPORT_FORMATS.PDF]: 'application/pdf',
  [REPORT_FORMATS.CSV]: 'text/csv',
  [REPORT_FORMATS.EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  [REPORT_FORMATS.JSON]: 'application/json',
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a string is a valid report type
 */
export function isValidReportType(type: string): type is typeof REPORT_TYPES[keyof typeof REPORT_TYPES] {
  return Object.values(REPORT_TYPES).includes(type as any);
}

/**
 * Type guard to check if a string is a valid report status
 */
export function isValidReportStatus(status: string): status is typeof REPORT_STATUS[keyof typeof REPORT_STATUS] {
  return Object.values(REPORT_STATUS).includes(status as any);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get display label for report type
 * @param type - Report type constant
 * @returns User-facing label
 */
export function getReportTypeLabel(type: string): string {
  return REPORT_TYPE_LABELS[type] || type;
}

/**
 * Get color for report type badge
 * @param type - Report type constant
 * @returns Ant Design color
 */
export function getReportTypeColor(type: string): string {
  return REPORT_TYPE_COLORS[type] || 'default';
}

/**
 * Get status label
 * @param status - Report status constant
 * @returns User-facing label
 */
export function getReportStatusLabel(status: string): string {
  return REPORT_STATUS_LABELS[status] || status;
}

/**
 * Get color for report status badge
 * @param status - Report status constant
 * @returns Ant Design status color
 */
export function getReportStatusColor(status: string): string {
  return REPORT_STATUS_COLORS[status] || 'default';
}
