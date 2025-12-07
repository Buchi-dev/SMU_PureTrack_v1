/**
 * Notification Preferences Schemas
 * Zod schemas for notification preference data validation
 * 
 * @module schemas/notification
 */

import { z } from 'zod';
import { ALERT_SEVERITY } from '../constants/waterQuality.constants';

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

/**
 * Notification Preferences Schema
 * Represents user notification preferences in Firestore
 */
export const NotificationPreferencesSchema = z.object({
  userId: z.string(),
  email: z.string().email('Valid email is required'),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  alertSeverities: z.array(z.string()),
  parameters: z.array(z.string()),
  devices: z.array(z.string()),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

/**
 * Preferences Data Schema
 * Used for setup/update operations
 * ✅ Validates alert severities against constants
 */
export const PreferencesDataSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  email: z.string().email('Valid email is required'),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  alertSeverities: z.array(z.enum([
    ALERT_SEVERITY.ADVISORY,
    ALERT_SEVERITY.WARNING,
    ALERT_SEVERITY.CRITICAL
  ] as const)).min(1, 'At least one severity must be selected'),
  parameters: z.array(z.string()).min(1, 'At least one parameter must be selected'),
  devices: z.array(z.string()).min(1, 'At least one device must be selected'),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Setup Preferences Request Schema
 */
export const SetupPreferencesRequestSchema = PreferencesDataSchema.extend({
  action: z.literal('setupPreferences'),
});

/**
 * Get User Preferences Request Schema
 */
export const GetUserPreferencesRequestSchema = z.object({
  action: z.literal('getUserPreferences'),
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * List All Preferences Request Schema
 */
export const ListAllPreferencesRequestSchema = z.object({
  action: z.literal('listAllPreferences'),
});

/**
 * Delete Preferences Request Schema
 */
export const DeletePreferencesRequestSchema = z.object({
  action: z.literal('deletePreferences'),
  userId: z.string().min(1, 'User ID is required'),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Preferences Operation Response Schema
 */
export const PreferencesResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: NotificationPreferencesSchema.optional(),
  error: z.string().optional(),
});

/**
 * List Preferences Response Schema
 */
export const ListPreferencesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(NotificationPreferencesSchema).optional(),
  error: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type PreferencesData = z.infer<typeof PreferencesDataSchema>;
export type SetupPreferencesRequest = z.infer<typeof SetupPreferencesRequestSchema>;
export type GetUserPreferencesRequest = z.infer<typeof GetUserPreferencesRequestSchema>;
export type ListAllPreferencesRequest = z.infer<typeof ListAllPreferencesRequestSchema>;
export type DeletePreferencesRequest = z.infer<typeof DeletePreferencesRequestSchema>;
export type PreferencesResponse = z.infer<typeof PreferencesResponseSchema>;
export type ListPreferencesResponse = z.infer<typeof ListPreferencesResponseSchema>;
