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
  getUserPreferences,
  updateNotificationPreferences,
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
router.get('/statistics', requireAuth, requireAdmin, getUserStatistics);

/**
 * @route   GET /api/v1/users/role/:role
 * @desc    Get users by role
 * @access  Protected (Admin only)
 */
router.get('/role/:role', requireAuth, requireAdmin, getUsersByRole);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with filters and pagination
 * @access  Protected (Admin only)
 */
router.get('/', requireAuth, requireAdmin, getAllUsers);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Protected (Admin only)
 */
router.post('/', requireAuth, requireAdmin, validateRequest(createUserSchema), createUser);

/**
 * @route   GET /api/v1/users/:id/preferences
 * @desc    Get notification preferences (must be before /:id to avoid conflict)
 * @access  Protected (Staff for own profile, Admin for all)
 */
router.get(
  '/:id/preferences',
  requireAuth,
  requireStaff,
  validateRequest(getUserByIdSchema),
  getUserPreferences
);

/**
 * @route   PATCH /api/v1/users/:id/profile
 * @desc    Update user profile (must be before /:id to avoid conflict)
 * @access  Protected (Staff for own profile, Admin for all)
 */
router.patch('/:id/profile', requireAuth, requireStaff, validateRequest(updateUserSchema), updateUser);

/**
 * @route   PATCH /api/v1/users/:id/complete-profile
 * @desc    Complete user profile - alias for profile update (must be before /:id to avoid conflict)
 * @access  Protected (Staff for own profile, Admin for all)
 */
router.patch('/:id/complete-profile', requireAuth, requireStaff, validateRequest(updateUserSchema), updateUser);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Update user status (must be before /:id to avoid conflict)
 * @access  Protected (Admin only)
 */
router.patch('/:id/status', requireAuth, requireAdmin, validateRequest(updateUserStatusSchema), updateUserStatus);

/**
 * @route   PATCH /api/v1/users/:id/role
 * @desc    Update user role (must be before /:id to avoid conflict)
 * @access  Protected (Admin only)
 */
router.patch('/:id/role', requireAuth, requireAdmin, validateRequest(updateUserRoleSchema), updateUserRole);

/**
 * @route   PATCH /api/v1/users/:id/preferences
 * @desc    Update notification preferences (must be before /:id to avoid conflict)
 * @access  Protected (Staff for own profile, Admin for all)
 */
router.patch(
  '/:id/preferences',
  requireAuth,
  requireStaff,
  validateRequest(updateNotificationPreferencesSchema),
  updateNotificationPreferences
);

/**
 * @route   PUT /api/v1/users/:id/preferences
 * @desc    Update notification preferences - alias for PATCH (must be before /:id to avoid conflict)
 * @access  Protected (Staff for own profile, Admin for all)
 */
router.put(
  '/:id/preferences',
  requireAuth,
  requireStaff,
  validateRequest(updateNotificationPreferencesSchema),
  updateNotificationPreferences
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Protected (Staff/Admin)
 */
router.get('/:id', requireAuth, requireStaff, validateRequest(getUserByIdSchema), getUserById);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update user
 * @access  Protected (Staff for own profile, Admin for all)
 */
router.patch('/:id', requireAuth, requireStaff, validateRequest(updateUserSchema), updateUser);

export default router;
