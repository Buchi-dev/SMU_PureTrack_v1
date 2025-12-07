/**
 * User Service
 * 
 * Business logic for user management:
 * - Firebase authentication integration
 * - User CRUD operations
 * - Role-based access control
 * - Notification preferences management
 * - User statistics and analytics
 * 
 * @module feature/users/user.service
 */

import User from './user.model';
import {
  IUserDocument,
  ICreateUserData,
  IUpdateUserData,
  IUserFilters,
  IUserStatistics,
  UserRole,
  UserStatus,
  AuthProvider,
} from './user.types';
import { CRUDOperations } from '@utils/queryBuilder.util';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '@utils/errors.util';
import { ERROR_MESSAGES } from '@core/configs/messages.config';
import { Types, Document } from 'mongoose';

/**
 * User Service Class
 * Handles all user-related business logic
 */
export class UserService {
  private crud: CRUDOperations<IUserDocument & Document>;

  constructor() {
    this.crud = new CRUDOperations<IUserDocument & Document>(User as any);
  }

  /**
   * Create a new user
   * Validates uniqueness of email/firebaseUid
   */
  async createUser(userData: ICreateUserData): Promise<IUserDocument> {
    // Check if user with email already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new ConflictError(ERROR_MESSAGES.USER.ALREADY_EXISTS);
    }

    // Check if firebaseUid is already used
    if (userData.firebaseUid) {
      const existingFirebaseUser = await User.findOne({ firebaseUid: userData.firebaseUid });
      if (existingFirebaseUser) {
        throw new ConflictError('User with this Firebase UID already exists');
      }
    }

    const newUser = await this.crud.create(userData as any);
    return newUser;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<IUserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('User ID'));
    }

    const user = await this.crud.findById(id);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    return user;
  }

  /**
   * Get user by Firebase UID
   */
  async getUserByFirebaseUid(firebaseUid: string): Promise<IUserDocument | null> {
    return User.findOne({ firebaseUid });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  /**
   * Get all users with filters and pagination
   */
  async getAllUsers(filters: IUserFilters, page = 1, limit = 50) {
    const query = this.crud.query();

    // Apply filters
    if (filters.role) query.filter({ role: filters.role });
    if (filters.status) query.filter({ status: filters.status });
    if (filters.provider) query.filter({ provider: filters.provider });
    if (filters.department) query.filter({ department: filters.department });

    // Search in name/email
    if (filters.search) {
      query.search(['displayName', 'email', 'firstName', 'lastName'], filters.search);
    }

    // Pagination and sorting
    query.paginate(page, limit).sortBy('-createdAt');

    return query.execute();
  }

  /**
   * Update user by ID
   * Uses atomic operation to prevent race conditions
   */
  async updateUser(id: string, updateData: IUpdateUserData): Promise<IUserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('User ID'));
    }

    // Validate user exists
    const user = await this.crud.findById(id);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    // Atomic update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      throw new NotFoundError(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    return updatedUser;
  }

  /**
   * Update user status (activate, suspend, etc.)
   */
  async updateUserStatus(id: string, status: UserStatus, updatedBy: Types.ObjectId): Promise<IUserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('User ID'));
    }

    // Check if user exists
    const user = await this.crud.findById(id);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    // Prevent user from changing their own status
    if (user._id.toString() === updatedBy.toString()) {
      throw new ForbiddenError('Cannot change your own status');
    }

    // Atomic update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (!updatedUser) {
      throw new NotFoundError(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    return updatedUser;
  }

  /**
   * Update user role
   * Only admins can change roles
   */
  async updateUserRole(
    id: string,
    role: UserRole,
    updatedBy: Types.ObjectId,
    updaterRole: UserRole
  ): Promise<IUserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('User ID'));
    }

    // Only admins can change roles
    if (updaterRole !== UserRole.ADMIN) {
      throw new ForbiddenError(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS);
    }

    // Check if user exists
    const user = await this.crud.findById(id);
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    // Prevent user from changing their own role
    if (user._id.toString() === updatedBy.toString()) {
      throw new ForbiddenError(ERROR_MESSAGES.USER.CANNOT_CHANGE_OWN_ROLE);
    }

    // Atomic update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true }
    );

    if (!updatedUser) {
      throw new NotFoundError(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    return updatedUser;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    id: string,
    preferences: Partial<IUserDocument['notificationPreferences']>
  ): Promise<IUserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('User ID'));
    }

    // Use $set with dot notation to update nested fields
    const updateFields: any = {};
    Object.keys(preferences).forEach((key) => {
      updateFields[`notificationPreferences.${key}`] = (preferences as any)[key];
    });

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      throw new NotFoundError(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    return updatedUser;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('User ID'));
    }

    await User.findByIdAndUpdate(id, { $set: { lastLogin: new Date() } });
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole, page = 1, limit = 50) {
    return this.getAllUsers({ role }, page, limit);
  }

  /**
   * Get active staff for email notifications
   * Returns users with emailNotifications enabled and active status
   */
  async getActiveStaffForNotifications(): Promise<IUserDocument[]> {
    return User.find({
      status: UserStatus.ACTIVE,
      'notificationPreferences.emailNotifications': true,
      'notificationPreferences.sendScheduledAlerts': true,
    }).lean() as any;
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<IUserStatistics> {
    const stats = await User.aggregate([
      {
        $facet: {
          byRole: [
            {
              $group: {
                _id: '$role',
                count: { $sum: 1 },
              },
            },
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          byProvider: [
            {
              $group: {
                _id: '$provider',
                count: { $sum: 1 },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const result = stats[0];

    return {
      total: result.total[0]?.count || 0,
      byRole: {
        admin: result.byRole.find((r: any) => r._id === UserRole.ADMIN)?.count || 0,
        staff: result.byRole.find((r: any) => r._id === UserRole.STAFF)?.count || 0,
      },
      byStatus: {
        active: result.byStatus.find((s: any) => s._id === UserStatus.ACTIVE)?.count || 0,
        pending: result.byStatus.find((s: any) => s._id === UserStatus.PENDING)?.count || 0,
        suspended: result.byStatus.find((s: any) => s._id === UserStatus.SUSPENDED)?.count || 0,
      },
      byProvider: {
        google: result.byProvider.find((p: any) => p._id === AuthProvider.GOOGLE)?.count || 0,
        firebase: result.byProvider.find((p: any) => p._id === AuthProvider.FIREBASE)?.count || 0,
        local: result.byProvider.find((p: any) => p._id === AuthProvider.LOCAL)?.count || 0,
      },
    };
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) {
      return false;
    }

    const user = await User.findById(userId).select('role');
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Get user count
   */
  async getUserCount(): Promise<number> {
    return User.countDocuments();
  }
}

export default new UserService();
