/**
 * User Management Schemas
 * Zod schemas for user management data validation
 * Aligned with MongoDB user model from Express backend
 * 
 * @module schemas/userManagement
 */

import { z } from 'zod';

// ============================================================================
// ENUMS (aligned with MongoDB model)
// ============================================================================

/**
 * User Status Schema (MongoDB enum values)
 * - active: User can access the system
 * - pending: User account is pending admin approval (new registrations)
 * - suspended: User account is suspended by admin
 */
export const UserStatusSchema = z.enum(['active', 'pending', 'suspended']);

/**
 * User Role Schema (MongoDB enum values)
 */
export const UserRoleSchema = z.enum(['admin', 'staff']);

/**
 * Auth Provider Schema
 */
export const AuthProviderSchema = z.enum(['google', 'local']);

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

/**
 * User Schema
 * Represents complete user data from MongoDB
 */
export const UserSchema = z.object({
  id: z.string(),
  googleId: z.string().optional(),
  email: z.string().email(),
  displayName: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profilePicture: z.string().optional(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  provider: AuthProviderSchema,
  lastLogin: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

/**
 * User List Data Schema
 * Represents user data in list operations
 */
export const UserListDataSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
  profilePicture: z.string().optional(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  provider: AuthProviderSchema.optional(),
  lastLogin: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Update User Status Request Schema
 */
export const UpdateUserStatusRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: UserStatusSchema,
});

/**
 * Update User Request Schema
 */
export const UpdateUserRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: UserStatusSchema.optional(),
  role: UserRoleSchema.optional(),
});

/**
 * Update User Profile Request Schema
 */
export const UpdateUserProfileRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  displayName: z.string().optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Update Status Response Schema
 */
export const UpdateStatusResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string(),
  status: UserStatusSchema,
});

/**
 * Update User Response Schema
 */
export const UpdateUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string(),
  updates: z.object({
    status: UserStatusSchema.optional(),
    role: UserRoleSchema.optional(),
  }),
});

/**
 * Update User Profile Response Schema
 */
export const UpdateUserProfileResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string(),
  updates: z.object({
    displayName: z.string().optional(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    department: z.string().optional(),
    phoneNumber: z.string().optional(),
  }),
});

/**
 * List Users Response Schema
 */
export const ListUsersResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(UserListDataSchema),
  count: z.number(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserStatus = z.infer<typeof UserStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserListData = z.infer<typeof UserListDataSchema>;
export type UpdateUserStatusRequest = z.infer<typeof UpdateUserStatusRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserProfileRequest = z.infer<typeof UpdateUserProfileRequestSchema>;
export type UpdateStatusResponse = z.infer<typeof UpdateStatusResponseSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
export type UpdateUserProfileResponse = z.infer<typeof UpdateUserProfileResponseSchema>;
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
