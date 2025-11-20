const express = require('express');
const {
  getUserById,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  updateUserProfile,
  deleteUser,
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
} = require('./user.Controller');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (with filters)
 * @access  Admin only
 */
router.get('/', ensureAdmin, getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Authenticated users
 */
router.get('/:id', ensureAuthenticated, getUserById);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.patch('/:id/role', ensureAdmin, updateUserRole);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Update user status
 * @access  Admin only
 */
router.patch('/:id/status', ensureAdmin, updateUserStatus);

/**
 * @route   PATCH /api/users/:id/profile
 * @desc    Update user profile
 * @access  Admin only
 */
router.patch('/:id/profile', ensureAdmin, updateUserProfile);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, deleteUser);

/**
 * @route   GET /api/users/:id/preferences
 * @desc    Get user notification preferences
 * @access  Authenticated users (own preferences or admin)
 */
router.get('/:id/preferences', ensureAuthenticated, getUserPreferences);

/**
 * @route   PUT /api/users/:id/preferences
 * @desc    Update user notification preferences
 * @access  Authenticated users (own preferences or admin)
 */
router.put('/:id/preferences', ensureAuthenticated, updateUserPreferences);

/**
 * @route   DELETE /api/users/:id/preferences
 * @desc    Reset user notification preferences to defaults
 * @access  Authenticated users (own preferences or admin)
 */
router.delete('/:id/preferences', ensureAuthenticated, resetUserPreferences);

module.exports = router;
