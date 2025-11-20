/**
 * Users Service
 * 
 * Manages user accounts, roles, permissions via Express REST API.
 * 
 * Write Operations: Express REST API
 * Read Operations: Express REST API (polling-based)
 * 
 * Features:
 * - User CRUD operations
 * - Role and status management
 * - Profile updates
 * - User list with pagination/filters
 * 
 * @module services/users
 */

import axios from 'axios';
import type { UserStatus, UserRole, UserListData } from '../schemas';

// ============================================================================
// AXIOS INSTANCE CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UpdateUserStatusRequest {
  userId: string;
  status: UserStatus;
}

export interface UpdateUserRequest {
  userId: string;
  status?: UserStatus;
  role?: UserRole;
}

export interface UpdateUserProfileRequest {
  userId: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
}

export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  data: UserListData;
  requiresLogout?: boolean;
}

export interface UpdateUserResponse {
  success: boolean;
  message: string;
  data: UserListData;
  requiresLogout?: boolean;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: UserListData;
  updates: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    department?: string;
    phoneNumber?: string;
  };
}

export interface ListUsersResponse {
  success: boolean;
  data: UserListData[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface DeleteUserResponse {
  success: boolean;
  message: string;
  userId: string;
}

export interface GetUserParams {
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
  error?: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// USER MANAGEMENT SERVICE
// ============================================================================

class UserService {
  /**
   * Get all users with optional filters
   * @param params - Query parameters for filtering and pagination
   * @returns Promise resolving to list of users
   */
  async getAllUsers(params?: GetUserParams): Promise<ListUsersResponse> {
    try {
      const response = await apiClient.get<ListUsersResponse>('/api/users', { params });
      
      // Convert ISO string dates back to Date objects
      const users = response.data.data.map((user) => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
      }));

      return {
        ...response.data,
        data: users,
      };
    } catch (error: any) {
      console.error('[UserService] Error fetching users:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  }

  /**
   * Get user by ID
   * @param userId - User ID
   * @returns Promise resolving to user data
   */
  async getUserById(userId: string): Promise<UserListData> {
    try {
      const response = await apiClient.get<{ success: boolean; data: UserListData }>(`/api/users/${userId}`);
      const user = response.data.data;
      
      // Convert ISO string dates back to Date objects
      return {
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
      };
    } catch (error: any) {
      console.error('[UserService] Error fetching user:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch user');
    }
  }

  /**
   * Update user status (active/inactive/suspended)
   * @param userId - User ID
   * @param status - New status
   * @returns Promise resolving to update result
   */
  async updateUserStatus(userId: string, status: UserStatus): Promise<UpdateStatusResponse> {
    try {
      const response = await apiClient.patch<UpdateStatusResponse>(`/api/users/${userId}/status`, { status });
      console.log('[UserService] User status updated:', { userId, status });
      return response.data;
    } catch (error: any) {
      console.error('[UserService] Error updating user status:', error);
      throw new Error(error.response?.data?.message || 'Failed to update user status');
    }
  }

  /**
   * Update user role (admin/staff/user)
   * @param userId - User ID
   * @param role - New role
   * @returns Promise resolving to update result
   */
  async updateUserRole(userId: string, role: UserRole): Promise<UpdateUserResponse> {
    try {
      const response = await apiClient.patch<UpdateUserResponse>(`/api/users/${userId}/role`, { role });
      console.log('[UserService] User role updated:', { userId, role });
      return response.data;
    } catch (error: any) {
      console.error('[UserService] Error updating user role:', error);
      throw new Error(error.response?.data?.message || 'Failed to update user role');
    }
  }

  /**
   * Update user profile (name, department, phone)
   * @param userId - User ID
   * @param profileData - Profile fields to update
   * @returns Promise resolving to update result
   */
  async updateUserProfile(userId: string, profileData: Omit<UpdateUserProfileRequest, 'userId'>): Promise<UpdateProfileResponse> {
    try {
      const response = await apiClient.patch<UpdateProfileResponse>(`/api/users/${userId}/profile`, profileData);
      console.log('[UserService] User profile updated:', { userId, updates: profileData });
      return response.data;
    } catch (error: any) {
      console.error('[UserService] Error updating user profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to update user profile');
    }
  }

  /**
   * Delete user account
   * @param userId - User ID
   * @returns Promise resolving to deletion result
   */
  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    try {
      const response = await apiClient.delete<DeleteUserResponse>(`/api/users/${userId}`);
      console.log('[UserService] User deleted:', { userId });
      return response.data;
    } catch (error: any) {
      console.error('[UserService] Error deleting user:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete user');
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS (Quick Actions)
  // ============================================================================

  /**
   * Approve user (set status to active)
   * @param userId - User ID
   */
  async approveUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'active');
  }

  /**
   * Suspend user (set status to suspended)
   * @param userId - User ID
   */
  async suspendUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'suspended');
  }

  /**
   * Reactivate user (set status to active)
   * @param userId - User ID
   */
  async reactivateUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'active');
  }

  /**
   * Promote user to admin
   * @param userId - User ID
   */
  async promoteToAdmin(userId: string): Promise<UpdateUserResponse> {
    return this.updateUserRole(userId, 'admin');
  }

  /**
   * Demote user to staff
   * @param userId - User ID
   */
  async demoteToStaff(userId: string): Promise<UpdateUserResponse> {
    return this.updateUserRole(userId, 'staff');
  }

  /**
   * Demote user to regular user
   * @param userId - User ID
   */
  async demoteToUser(userId: string): Promise<UpdateUserResponse> {
    return this.updateUserRole(userId, 'user');
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const usersService = new UserService();
export default usersService;
