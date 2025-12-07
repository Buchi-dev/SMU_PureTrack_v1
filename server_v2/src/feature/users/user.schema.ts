/**
 * User Validation Schemas
 * Zod schemas for runtime validation with TypeScript type inference
 */

import { z } from 'zod';
import { UserRole, UserStatus, AuthProvider } from './user.types';

/**
 * User query filters schema
 */
export const userFiltersSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  provider: z.nativeEnum(AuthProvider).optional(),
  department: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

/**
 * Create user schema
 */
export const createUserSchema = z.object({
  body: z.object({
    firebaseUid: z.string().optional(),
    googleId: z.string().optional(),
    email: z.string().email('Invalid email address'),
    displayName: z.string().min(1, 'Display name is required'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    middleName: z.string().optional(),
    department: z.string().optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?\d{10,15}$/, 'Invalid phone number format')
      .optional(),
    profilePicture: z.string().url('Invalid URL').optional(),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    provider: z.nativeEnum(AuthProvider).optional(),
  }),
});

/**
 * Update user schema
 */
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
  body: z.object({
    displayName: z.string().min(1).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    middleName: z.string().optional(),
    department: z.string().optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?\d{10,15}$/, 'Invalid phone number format')
      .optional(),
    profilePicture: z.string().url('Invalid URL').optional(),
  }),
});

/**
 * Update user status schema
 */
export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
});

/**
 * Update user role schema
 */
export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
  body: z.object({
    role: z.nativeEnum(UserRole),
  }),
});

/**
 * Update notification preferences schema
 */
export const updateNotificationPreferencesSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
  body: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    sendScheduledAlerts: z.boolean().optional(),
    alertSeverities: z.array(z.enum(['Critical', 'Warning', 'Advisory'])).optional(),
    parameters: z.array(z.enum(['pH', 'Turbidity', 'TDS'])).optional(),
    devices: z.array(z.string()).optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
    quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  }),
});

/**
 * Get user by ID schema
 */
export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
});

// Export inferred types for use in controllers
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
