/**
 * User Controller
 * HTTP request handlers for user management endpoints
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '@core/middlewares';
import userService from './user.service';
import { ResponseHandler } from '@utils/response.util';
import { asyncHandler } from '@utils/asyncHandler.util';
import { SUCCESS_MESSAGES } from '@core/configs/messages.config';

/**
 * Get all users with filters
 * @route GET /api/v1/users
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const {
    role,
    status,
    provider,
    department,
    search,
    page = 1,
    limit = 50,
  } = req.query;

  const filters = {
    ...(role && { role: role as any }),
    ...(status && { status: status as any }),
    ...(provider && { provider: provider as any }),
    ...(department && { department: department as string }),
    ...(search && { search: search as string }),
  };

  const result = await userService.getAllUsers(filters, Number(page), Number(limit));

  const usersData = result.data.map((user) => user.toPublicProfile());

  ResponseHandler.paginated(res, usersData, result.pagination);
});

/**
 * Get user by ID
 * @route GET /api/v1/users/:id
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('User ID is required');
  }

  const user = await userService.getUserById(id);

  ResponseHandler.success(res, user.toPublicProfile());
});

/**
 * Get current user profile
 * @route GET /api/v1/users/me
 */
export const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId; // userId is the MongoDB _id as string

  const user = await userService.getUserById(userId);

  ResponseHandler.success(res, user.toPublicProfile());
});

/**
 * Create new user
 * @route POST /api/v1/users
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const userData = req.body;

  const newUser = await userService.createUser(userData);

  ResponseHandler.created(res, newUser.toPublicProfile(), SUCCESS_MESSAGES.USER.CREATED);
});

/**
 * Update user
 * @route PATCH /api/v1/users/:id
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('User ID is required');
  }

  const updateData = req.body;

  const updatedUser = await userService.updateUser(id, updateData);

  ResponseHandler.success(res, updatedUser.toPublicProfile(), SUCCESS_MESSAGES.USER.UPDATED);
});

/**
 * Update user status
 * @route PATCH /api/v1/users/:id/status
 */
export const updateUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('User ID is required');
  }

  const { status } = req.body;
  const updatedBy = new Types.ObjectId(req.user!.userId);

  const updatedUser = await userService.updateUserStatus(id, status, updatedBy);

  ResponseHandler.success(
    res,
    updatedUser.toPublicProfile(),
    SUCCESS_MESSAGES.USER.STATUS_UPDATED
  );
});

/**
 * Update user role
 * @route PATCH /api/v1/users/:id/role
 */
export const updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('User ID is required');
  }

  const { role } = req.body;
  const updatedBy = new Types.ObjectId(req.user!.userId);
  const updaterRole = req.user!.role;

  const updatedUser = await userService.updateUserRole(id, role, updatedBy, updaterRole);

  ResponseHandler.success(res, updatedUser.toPublicProfile(), SUCCESS_MESSAGES.USER.UPDATED);
});

/**
 * Get user notification preferences
 * @route GET /api/v1/users/:id/preferences
 */
export const getUserPreferences = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throw new Error('User ID is required');
    }

    const user = await userService.getUserById(id);

    ResponseHandler.success(
      res,
      user.notificationPreferences,
      'Notification preferences retrieved successfully'
    );
  }
);

/**
 * Update notification preferences
 * @route PATCH /api/v1/users/:id/preferences
 */
export const updateNotificationPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throw new Error('User ID is required');
    }

    const preferences = req.body;

    const updatedUser = await userService.updateNotificationPreferences(id, preferences);

    ResponseHandler.success(
      res,
      updatedUser.toPublicProfile(),
      'Notification preferences updated successfully'
    );
  }
);

/**
 * Get user statistics
 * @route GET /api/v1/users/statistics
 */
export const getUserStatistics = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await userService.getUserStatistics();

  ResponseHandler.success(res, stats);
});

/**
 * Get users by role
 * @route GET /api/v1/users/role/:role
 */
export const getUsersByRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const result = await userService.getUsersByRole(role as any, Number(page), Number(limit));

  const usersData = result.data.map((user) => user.toPublicProfile());

  ResponseHandler.paginated(res, usersData, result.pagination);
});
