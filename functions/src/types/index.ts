import * as admin from "firebase-admin";

// ===========================
// ALERT TYPES
// ===========================

export type AlertSeverity = "Advisory" | "Warning" | "Critical";
export type AlertStatus = "Active" | "Acknowledged" | "Resolved";
export type WaterParameter = "tds" | "ph" | "turbidity";
export type TrendDirection = "increasing" | "decreasing" | "stable";
export type AlertType = "threshold" | "trend";

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
  createdAt: admin.firestore.FieldValue;
  notificationsSent: string[];
  metadata?: {
    previousValue?: number;
    changeRate?: number;
    location?: string;
  };
}

export interface ThresholdConfig {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  unit: string;
}

export interface AlertThresholds {
  tds: ThresholdConfig;
  ph: ThresholdConfig;
  turbidity: ThresholdConfig;
  trendDetection: {
    enabled: boolean;
    thresholdPercentage: number;
    timeWindowMinutes: number;
  };
}

export interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSeverities: AlertSeverity[];
  parameters: WaterParameter[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// ===========================
// DEVICE TYPES
// ===========================

export type DeviceStatus = "online" | "offline" | "error" | "maintenance";

export interface DeviceLocation {
  building: string;
  floor: string;
  notes?: string;
}

export interface DeviceMetadata {
  location?: DeviceLocation;
  description?: string;
  owner?: string;
  [key: string]: string | number | boolean | undefined | DeviceLocation;
}

export interface DeviceData {
  deviceId?: string;
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  status?: DeviceStatus;
  metadata?: DeviceMetadata;
}

export interface Device {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: DeviceStatus;
  registeredAt: admin.firestore.FieldValue;
  lastSeen: admin.firestore.FieldValue;
  updatedAt?: admin.firestore.FieldValue;
  metadata: DeviceMetadata;
}

// ===========================
// SENSOR TYPES
// ===========================

export interface SensorReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  ph: number;
  timestamp: number;
  receivedAt: number | object;
}

export interface SensorData {
  turbidity?: number;
  tds?: number;
  ph?: number;
  timestamp?: number;
}

// ===========================
// ANALYTICS TYPES
// ===========================

export interface DeviceReportSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  healthScore: number;
}

export interface DeviceReport {
  summary: DeviceReportSummary;
  devices: Array<Record<string, unknown>>;
}

export interface AlertData {
  id: string;
  severity: AlertSeverity;
  deviceId: string;
  deviceName?: string;
  parameter: WaterParameter;
  currentValue?: number;
  createdAt?: admin.firestore.Timestamp;
}

export interface DeviceSummary {
  deviceId: string;
  name: string;
  location?: DeviceLocation;
  status: DeviceStatus;
  lastSeen: admin.firestore.FieldValue;
  reading: {
    turbidity: number;
    tds: number;
    ph: number;
    timestamp: number;
  };
}

export interface AlertCounts {
  Critical: number;
  Warning: number;
  Advisory: number;
}

export interface WaterQualityMetrics {
  avgTurbidity: number;
  maxTurbidity: number;
  minTurbidity: number;
  avgTDS: number;
  maxTDS: number;
  minTDS: number;
  avgPH: number;
  maxPH: number;
  minPH: number;
  totalReadings: number;
  timeRange: {start: number; end: number};
}

export interface ComplianceStatus {
  parameter: string;
  value: number;
  standard: number;
  unit: string;
  status: "compliant" | "warning" | "violation";
  percentage: number;
}

// ===========================
// REQUEST/RESPONSE TYPES
// ===========================

export type DeviceAction =
  | "DISCOVER_DEVICES"
  | "SEND_COMMAND"
  | "ADD_DEVICE"
  | "GET_DEVICE"
  | "UPDATE_DEVICE"
  | "DELETE_DEVICE"
  | "LIST_DEVICES"
  | "GET_SENSOR_READINGS"
  | "GET_SENSOR_HISTORY";

export interface DeviceManagementRequest {
  action: DeviceAction;
  deviceId?: string;
  deviceData?: DeviceData;
  command?: string;
  params?: Record<string, unknown>;
  limit?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// ===========================
// MQTT/PUB-SUB TYPES
// ===========================

export interface DeviceRegistrationInfo {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
}

export interface CommandMessage {
  command: string;
  params?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
}

// ===========================
// REPORT TYPES
// ===========================

export interface ReportRequest {
  reportType: "water_quality" | "device_status" | "data_summary" | "compliance";
  deviceId?: string;
  startDate?: number;
  endDate?: number;
  format?: "json" | "pdf" | "excel";
  includeCharts?: boolean;
}

// ===========================
// USER & AUTH TYPES
// ===========================

export type UserStatus = "Pending" | "Approved" | "Suspended";
export type UserRole = "Staff" | "Admin";

export interface UserProfile {
  uuid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: admin.firestore.FieldValue;
  updatedAt?: admin.firestore.FieldValue;
  lastLogin?: admin.firestore.FieldValue;
}

export interface LoginLog {
  uid: string;
  email: string;
  displayName: string;
  statusAttempted: UserStatus;
  timestamp: admin.firestore.FieldValue;
  result: "success" | "rejected" | "error";
  message: string;
  ipAddress?: string;
  userAgent?: string;
}
