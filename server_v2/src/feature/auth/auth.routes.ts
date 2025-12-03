/**
 * Auth Routes
 * API endpoints for authentication
 */

import { Router } from 'express';
import { verifyToken, getCurrentUser, checkAuthStatus, logout } from './auth.controller';
import { requireAuth } from '@core/middlewares';

const router = Router();

/**
 * @route   POST /auth/verify-token
 * @desc    Verify Firebase ID token and sync user to database
 * @access  Public
 */
router.post('/verify-token', verifyToken);

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
router.get('/status', (req, res, next) => {
  // Make auth optional for this endpoint
  requireAuth(req, res, (err) => {
    if (err) {
      // Auth failed, continue anyway to return unauthenticated status
      return checkAuthStatus(req, res, next);
    }
    return checkAuthStatus(req, res, next);
  });
});

/**
 * @route   POST /auth/logout
 * @desc    Logout (placeholder - client handles Firebase logout)
 * @access  Public
 */
router.post('/logout', logout);

export default router;
