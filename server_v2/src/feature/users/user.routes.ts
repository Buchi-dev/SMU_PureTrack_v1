/**
 * User Routes
 * API endpoints for user management
 */

import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  getCurrentUser,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserRole,
  updateNotificationPreferences,
  deleteUser,
  getUserStatistics,
  getUsersByRole,
} from './user.controller';
import { requireAuth, requireStaff, requireAdmin } from '@core/middlewares';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  updateNotificationPreferencesSchema,
  getUserByIdSchema,
  deleteUserSchema,
} from './user.schema';

const router = Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile (must be before /:id to avoid conflict)
 * @access  Protected (Staff/Admin)
 */
router.get('/me', requireAuth, getCurrentUser);

/**
 * @route   GET /api/v1/users/statistics
 * @desc    Get user statistics
 * @access  Protected (Admin only)
 */
router.get('/statistics', requireAdmin, getUserStatistics);

/**
 * @route   GET /api/v1/users/role/:role
 * @desc    Get users by role
 * @access  Protected (Admin only)
 */
router.get('/role/:role', requireAdmin, getUsersByRole);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with filters and pagination
 * @access  Protected (Admin only)
 */
router.get('/', requireAdmin, getAllUsers);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Protected (Admin only)
 */
router.post('/', requireAdmin, validateRequest(createUserSchema), createUser);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Protected (Staff/Admin)
 */
router.get('/:id', requireStaff, validateRequest(getUserByIdSchema), getUserById);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update user
 * @access  Protected (Staff for own profile, Admin for all)
 */
router.patch('/:id', requireStaff, validateRequest(updateUserSchema), updateUser);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Update user status
 * @access  Protected (Admin only)
 */
router.patch('/:id/status', requireAdmin, validateRequest(updateUserStatusSchema), updateUserStatus);

/**
 * @route   PATCH /api/v1/users/:id/role
 * @desc    Update user role
 * @access  Protected (Admin only)
 */
router.patch('/:id/role', requireAdmin, validateRequest(updateUserRoleSchema), updateUserRole);

/**
 * @route   PATCH /api/v1/users/:id/preferences
 * @desc    Update notification preferences
 * @access  Protected (Staff for own profile, Admin for all)
 */
router.patch(
  '/:id/preferences',
  requireStaff,
  validateRequest(updateNotificationPreferencesSchema),
  updateNotificationPreferences
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user
 * @access  Protected (Admin only)
 */
router.delete('/:id', requireAdmin, validateRequest(deleteUserSchema), deleteUser);

export default router;
