/**
 * Alert Management Types
 * Type definitions for alert management operations
 *
 * @module types/alertManagement.types
 */

// ===========================
// ALERT TYPES
// ===========================

/**
 * Alert severity levels
 */
export type AlertSeverity = "Advisory" | "Warning" | "Critical";

/**
 * Alert status
 */
export type AlertStatus = "Active" | "Acknowledged" | "Resolved";

/**
 * Water quality parameters
 */
export type WaterParameter = "tds" | "ph" | "turbidity";

/**
 * Trend direction
 */
export type TrendDirection = "increasing" | "decreasing" | "stable";

/**
 * Alert type
 */
export type AlertType = "threshold" | "trend";

/**
 * Water Quality Alert Document
 */
export interface WaterQualityAlert {
  alertId: string;
  deviceId: string;
  deviceName?: string;
  deviceBuilding?: string;
  deviceFloor?: string;
  parameter: WaterParameter;
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  currentValue: number;
  thresholdValue?: number;
  trendDirection?: TrendDirection;
  message: string;
  recommendedAction: string;
  createdAt: FirebaseFirestore.Timestamp;
  acknowledgedAt?: FirebaseFirestore.Timestamp;
  acknowledgedBy?: string;
  resolvedAt?: FirebaseFirestore.Timestamp;
  resolvedBy?: string;
  resolutionNotes?: string;
  notificationsSent: string[];
  metadata?: {
    previousValue?: number;
    changeRate?: number;
    location?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

// ===========================
// REQUEST TYPES
// ===========================

/**
 * Alert filters for listing
 */
export interface AlertFilters {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  parameter?: WaterParameter[];
  deviceId?: string[];
}

/**
 * Request to acknowledge an alert
 */
export interface AcknowledgeAlertRequest {
  action: "acknowledgeAlert";
  alertId: string;
}

/**
 * Request to resolve an alert
 */
export interface ResolveAlertRequest {
  action: "resolveAlert";
  alertId: string;
  notes?: string;
}

/**
 * Request to list alerts
 */
export interface ListAlertsRequest {
  action: "listAlerts";
  filters?: AlertFilters;
}

/**
 * Request to acknowledge a digest
 */
export interface AcknowledgeDigestRequest {
  action: "acknowledgeDigest";
  digestId: string;
  token: string;
}

// ===========================
// RESPONSE TYPES
// ===========================

/**
 * Response for alert operations
 */
export interface AlertResponse {
  success: boolean;
  message?: string;
  alert?: {
    alertId: string;
    status: AlertStatus;
  };
  alerts?: WaterQualityAlert[];
  error?: string;
}
