/**
 * Auth Routes
 * API endpoints for authentication
 */

import { Router } from 'express';
import { verifyToken, getCurrentUser, checkAuthStatus, logout, completeAccount } from './auth.controller';
import { requireAuth, optionalAuth } from '@core/middlewares';
import { validateRequest } from '@core/middlewares/validation.middleware';
import { completeAccountSchema, verifyTokenSchema } from './auth.validation';

const router = Router();

/**
 * @route   POST /auth/verify-token
 * @desc    Verify Firebase ID token (does NOT create user)
 * @access  Public
 */
router.post('/verify-token', validateRequest(verifyTokenSchema), verifyToken);

/**
 * @route   POST /auth/complete-account
 * @desc    Complete account registration after Firebase authentication
 * @access  Public (requires Firebase token in header)
 */
router.post('/complete-account', validateRequest(completeAccountSchema), completeAccount);

/**
 * @route   GET /auth/current-user
 * @desc    Get current authenticated user
 * @access  Protected
 */
router.get('/current-user', requireAuth, getCurrentUser);

/**
 * @route   GET /auth/status
 * @desc    Check authentication status
 * @access  Public (checks if token is valid)
 */
router.get('/status', optionalAuth, checkAuthStatus);

/**
 * @route   POST /auth/logout
 * @desc    Logout (placeholder - client handles Firebase logout)
 * @access  Public
 */
router.post('/logout', logout);

export default router;
