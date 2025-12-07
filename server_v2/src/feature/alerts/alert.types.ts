/**
 * Alert Types
 * TypeScript interfaces and types for alert management
 */

import { Types, Document } from 'mongoose';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  CRITICAL = 'Critical',
  WARNING = 'Warning',
  ADVISORY = 'Advisory',
}

/**
 * Alert status
 */
export enum AlertStatus {
  UNACKNOWLEDGED = 'Unacknowledged',
  ACKNOWLEDGED = 'Acknowledged',
  RESOLVED = 'Resolved',
}

/**
 * Sensor parameters that can trigger alerts
 */
export enum AlertParameter {
  PH = 'pH',
  TURBIDITY = 'Turbidity',
  TDS = 'TDS',
}

/**
 * Base alert interface
 */
export interface IAlert {
  _id: Types.ObjectId;
  alertId: string;
  deviceId: string;
  deviceName: string;
  deviceLocation?: string; // Device location string
  severity: AlertSeverity;
  parameter: AlertParameter;
  value: number;
  threshold: number;
  message: string;
  status: AlertStatus;
  acknowledgedAt?: Date;
  acknowledgedBy?: Types.ObjectId;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolutionNotes?: string;
  timestamp: Date;
  acknowledged: boolean;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  currentValue: number;
  emailSent: boolean;
  emailSentAt?: Date;
  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  scheduledPermanentDeletionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert document interface (with Mongoose methods)
 */
export interface IAlertDocument extends IAlert, Document {
  toPublicProfile(): IAlertPublic;
}

/**
 * Public alert data (safe for client)
 */
export interface IAlertPublic {
  id: Types.ObjectId;
  alertId: string;
  deviceId: string;
  deviceName: string;
  deviceLocation?: string;
  severity: AlertSeverity;
  parameter: AlertParameter;
  value: number;
  threshold: number;
  message: string;
  status: AlertStatus;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: Types.ObjectId | IUserPublic;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId | IUserPublic;
  resolutionNotes?: string;
  timestamp: Date;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  currentValue: number;
  emailSent: boolean;
  emailSentAt?: Date;
  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  scheduledPermanentDeletionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User reference for populated fields (minimal data)
 */
export interface IUserPublic {
  _id: Types.ObjectId;
  displayName: string;
  email: string;
}

/**
 * Alert creation data
 */
export interface ICreateAlertData {
  deviceId: string;
  deviceName: string;
  deviceLocation?: string;
  severity: AlertSeverity;
  parameter: AlertParameter;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  currentValue: number;
}

/**
 * Alert update data
 */
export interface IUpdateAlertData {
  status?: AlertStatus;
  acknowledgedBy?: Types.ObjectId;
  resolvedBy?: Types.ObjectId;
  resolutionNotes?: string;
}

/**
 * Alert cooldown check result
 */
export interface IAlertCooldownResult {
  canCreateAlert: boolean;
  existingAlertId?: Types.ObjectId;
  minutesRemaining?: number;
  message?: string;
  activeAlert?: IAlertDocument;
}

/**
 * Alert threshold definition
 */
export interface IAlertThreshold {
  min?: number;
  max?: number;
}

/**
 * Alert query filters
 */
export interface IAlertFilters {
  deviceId?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  parameter?: AlertParameter;
  acknowledged?: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Alert statistics
 */
export interface IAlertStatistics {
  total: number;
  bySeverity: {
    critical: number;
    warning: number;
    advisory: number;
  };
  byStatus: {
    unacknowledged: number;
    acknowledged: number;
    resolved: number;
  };
  byParameter: {
    pH: number;
    turbidity: number;
    tds: number;
  };
}
