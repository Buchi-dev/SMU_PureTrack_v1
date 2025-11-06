/**
 * Report Generation Constants
 * Error messages and success messages for report generation operations
 *
 * @module constants/reportGeneration.constants
 */

// ===========================
// ERROR MESSAGES
// ===========================

/**
 * Standardized error messages for report generation
 * Use these constants for consistent error handling
 */
export const REPORT_GENERATION_ERRORS = {
  // Validation errors
  MISSING_REPORT_TYPE: "Report type is required",
  INVALID_REPORT_TYPE: "Invalid report type specified",
  INVALID_DATE_RANGE: "Invalid date range provided",

  // Authentication errors
  UNAUTHENTICATED: "Authentication required to generate reports",

  // Data errors
  NO_DEVICES_FOUND: "No devices found for report generation",
  NO_DATA_AVAILABLE: "No data available for the specified period",
  INSUFFICIENT_DATA: "Insufficient data to generate report",

  // Operation errors
  WATER_QUALITY_FAILED: "Failed to generate water quality report",
  DEVICE_STATUS_FAILED: "Failed to generate device status report",
  DATA_SUMMARY_FAILED: "Failed to generate data summary report",
  COMPLIANCE_FAILED: "Failed to generate compliance report",
  GENERATION_FAILED: "Failed to generate report",
} as const;

// ===========================
// SUCCESS MESSAGES
// ===========================

/**
 * Standardized success messages for report generation
 * Use these constants for consistent success responses
 */
export const REPORT_GENERATION_MESSAGES = {
  WATER_QUALITY_SUCCESS: "Water quality report generated successfully",
  DEVICE_STATUS_SUCCESS: "Device status report generated successfully",
  DATA_SUMMARY_SUCCESS: "Data summary report generated successfully",
  COMPLIANCE_SUCCESS: "Compliance report generated successfully",
  GENERATION_SUCCESS: "Report generated successfully",
} as const;
