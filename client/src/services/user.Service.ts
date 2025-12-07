/**
 * Users Service
 * 
 * Manages user accounts, roles, permissions via Express REST API.
 * 
 * Server Endpoints:
 * - GET    /api/v1/users              - Get all users (admin only, with pagination)
 * - GET    /api/v1/users/:id          - Get user by ID (authenticated)
 * - PATCH  /api/v1/users/:id/role     - Update user role (admin only)
 * - PATCH  /api/v1/users/:id/status   - Update user status (admin only)
 * - PATCH  /api/v1/users/:id/profile  - Update user profile (admin only)
 * - PATCH  /api/v1/users/:id/complete-profile - Complete profile (self-service)
 * - DELETE /api/v1/users/:id          - Delete user (admin only)
 * - GET    /api/v1/users/:id/preferences - Get notification preferences
 * - PUT    /api/v1/users/:id/preferences - Update notification preferences
 * - DELETE /api/v1/users/:id/preferences - Reset notification preferences
 * 
 * @module services/users
 */

import { apiClient, getErrorMessage } from '../config/api.config';
import { USER_ENDPOINTS, buildUsersUrl } from '../config/endpoints';
import type { UserStatus, UserRole, UserListData } from '../schemas';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UpdateUserRoleRequest {
  role: UserRole;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface UpdateUserProfileRequest {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
}

export interface CompleteUserProfileRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  department: string;
  phoneNumber: string;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserResponse {
  success: boolean;
  data: UserListData;
  message?: string;
  requiresLogout?: boolean;
}

export interface UserListResponse {
  success: boolean;
  data: UserListData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface UserPreferences {
  email: {
    alerts: boolean;
    reports: boolean;
    systemUpdates: boolean;
  };
  alertThresholds?: {
    ph?: { min: number; max: number };
    turbidity?: number;
    tds?: number;
  };
}

export interface UserPreferencesResponse {
  success: boolean;
  data: UserPreferences;
}

// ============================================================================
// USER MANAGEMENT SERVICE
// ============================================================================

export class UserService {
  async getAllUsers(filters?: UserFilters): Promise<UserListResponse> {
    try {
      const url = buildUsersUrl(filters);
      const response = await apiClient.get<UserListResponse>(url);
      const users = response.data.data.map((user) => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
      }));
      return { ...response.data, data: users };
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Get all users error:', message);
      throw new Error(message);
    }
  }

  async getUserById(userId: string): Promise<UserResponse> {
    try {
      const response = await apiClient.get<UserResponse>(USER_ENDPOINTS.BY_ID(userId));
      const user = response.data.data;
      return {
        ...response.data,
        data: {
          ...user,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
        },
      };
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Get user error:', message);
      throw new Error(message);
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferencesResponse> {
    try {
      const response = await apiClient.get<UserPreferencesResponse>(USER_ENDPOINTS.PREFERENCES(userId));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Get preferences error:', message);
      throw new Error(message);
    }
  }

  async updateUserRole(userId: string, role: UserRole): Promise<UserResponse> {
    try {
      const response = await apiClient.patch<UserResponse>(USER_ENDPOINTS.UPDATE_ROLE(userId), { role });
      console.log('[UserService] User role updated:', { userId, role });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Update role error:', message);
      throw new Error(message);
    }
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<UserResponse> {
    try {
      const response = await apiClient.patch<UserResponse>(USER_ENDPOINTS.UPDATE_STATUS(userId), { status });
      console.log('[UserService] User status updated:', { userId, status });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Update status error:', message);
      throw new Error(message);
    }
  }

  async updateUserProfile(userId: string, data: UpdateUserProfileRequest): Promise<UserResponse> {
    try {
      const response = await apiClient.patch<UserResponse>(USER_ENDPOINTS.UPDATE_PROFILE(userId), data);
      console.log('[UserService] User profile updated:', { userId });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Update profile error:', message);
      throw new Error(message);
    }
  }

  async completeUserProfile(userId: string, data: CompleteUserProfileRequest): Promise<UserResponse> {
    try {
      const response = await apiClient.patch<UserResponse>(USER_ENDPOINTS.COMPLETE_PROFILE(userId), data);
      console.log('[UserService] Profile completed:', { userId });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Complete profile error:', message);
      throw new Error(message);
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferencesResponse> {
    try {
      const response = await apiClient.put<UserPreferencesResponse>(USER_ENDPOINTS.PREFERENCES(userId), preferences);
      console.log('[UserService] Preferences updated:', { userId });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Update preferences error:', message);
      throw new Error(message);
    }
  }

  async resetUserPreferences(userId: string): Promise<UserPreferencesResponse> {
    try {
      const response = await apiClient.delete<UserPreferencesResponse>(USER_ENDPOINTS.PREFERENCES(userId));
      console.log('[UserService] Preferences reset:', { userId });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[UserService] Reset preferences error:', message);
      throw new Error(message);
    }
  }
}

export const userService = new UserService();
