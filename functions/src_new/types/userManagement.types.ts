/**
 * User Management Type Definitions
 * Type definitions specific to user management operations
 *
 * @module types/userManagement.types
 */

import type {UserStatus, UserRole} from "../constants/userManagement.constants";

// ===========================
// REQUEST TYPES
// ===========================

/**
 * Request payload for updating user status
 */
export interface UpdateUserStatusRequest {
  userId: string;
  status: UserStatus;
}

/**
 * Request payload for updating user information
 * Can update status and/or role
 */
export interface UpdateUserRequest {
  userId: string;
  status?: UserStatus;
  role?: UserRole;
}

// ===========================
// RESPONSE TYPES
// ===========================

/**
 * Standard success response for user operations
 */
export interface UserOperationResponse {
  success: boolean;
  message: string;
  userId: string;
}

/**
 * Response for status update operation
 */
export interface UpdateStatusResponse extends UserOperationResponse {
  status: UserStatus;
}

/**
 * Response for user update operation
 */
export interface UpdateUserResponse extends UserOperationResponse {
  updates: {
    status?: UserStatus;
    role?: UserRole;
  };
}

/**
 * User data returned from list operation
 */
export interface ListUserData {
  id: string;
  uuid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

/**
 * Response for list users operation
 */
export interface ListUsersResponse {
  success: boolean;
  users: ListUserData[];
  count: number;
}
