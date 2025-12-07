/**
 * User Types
 * TypeScript interfaces and types for user management
 */

import { Types, Document } from 'mongoose';

/**
 * User roles
 */
export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
}

/**
 * User status
 */
export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

/**
 * Authentication provider
 */
export enum AuthProvider {
  GOOGLE = 'google',
  FIREBASE = 'firebase',
  LOCAL = 'local',
}

/**
 * Notification preferences interface
 */
export interface INotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  sendScheduledAlerts: boolean;
  alertSeverities: ('Critical' | 'Warning' | 'Advisory')[];
  parameters: ('pH' | 'Turbidity' | 'TDS')[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

/**
 * Base user interface
 */
export interface IUser {
  _id: Types.ObjectId;
  firebaseUid?: string;
  googleId?: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
  profilePicture?: string;
  role: UserRole;
  status: UserStatus;
  provider: AuthProvider;
  lastLogin: Date;
  notificationPreferences: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User document interface (with Mongoose methods)
 */
export interface IUserDocument extends IUser, Document {
  toPublicProfile(): IUserPublic;
}

/**
 * Public user data (safe for client)
 */
export interface IUserPublic {
  _id: Types.ObjectId;
  id: Types.ObjectId;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
  profilePicture?: string;
  role: UserRole;
  status: UserStatus;
  provider: AuthProvider;
  lastLogin: Date;
  notificationPreferences: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation data
 */
export interface ICreateUserData {
  firebaseUid?: string;
  googleId?: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
  profilePicture?: string;
  role?: UserRole;
  status?: UserStatus;
  provider?: AuthProvider;
  notificationPreferences?: Partial<INotificationPreferences>;
}

/**
 * User update data
 */
export interface IUpdateUserData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
  profilePicture?: string;
  role?: UserRole;
  status?: UserStatus;
  notificationPreferences?: Partial<INotificationPreferences>;
}

/**
 * User query filters
 */
export interface IUserFilters {
  role?: UserRole;
  status?: UserStatus;
  provider?: AuthProvider;
  search?: string; // Search in name/email
  department?: string;
}

/**
 * User statistics
 */
export interface IUserStatistics {
  total: number;
  byRole: {
    admin: number;
    staff: number;
  };
  byStatus: {
    active: number;
    pending: number;
    suspended: number;
  };
  byProvider: {
    google: number;
    firebase: number;
    local: number;
  };
}
