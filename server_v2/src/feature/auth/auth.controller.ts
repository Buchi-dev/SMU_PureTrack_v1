/**
 * Auth Controller
 * Handles authentication-related endpoints
 * 
 * @module feature/auth/auth.controller
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@core/middlewares/auth.middleware';
import { ResponseHandler } from '@utils/response.util';
import userService from '@feature/users/user.service';
import { UnauthorizedError } from '@utils/errors.util';
import { ERROR_MESSAGES } from '@core/configs/messages.config';
import { getFirebaseAuth } from '@core/configs';
import { logInfo } from '@utils';

/**
 * Verify Firebase ID token and sync user to database
 * POST /auth/verify-token
 */
export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new UnauthorizedError('ID token is required');
    }

    // Verify token with Firebase
    const decodedToken = await getFirebaseAuth().verifyIdToken(idToken);
    
    logInfo(`[Auth] Token verified for user: ${decodedToken.email}`);

    // Check if email is from allowed domain
    if (!decodedToken.email?.endsWith('@smu.edu.ph')) {
      throw new UnauthorizedError('Only @smu.edu.ph email addresses are allowed');
    }

    // Sync user to database (create if doesn't exist)
    let user = await userService.getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      // Create new user
      logInfo(`[Auth] Creating new user for: ${decodedToken.email}`);
      user = await userService.createUser({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email.split('@')[0],
        profilePicture: decodedToken.picture,
        provider: 'google' as any,
        status: 'pending' as any, // New users start as pending
      });
      logInfo(`[Auth] New user created with ID: ${user._id}`);
    } else {
      // Update last login for existing user
      logInfo(`[Auth] User exists, updating last login: ${decodedToken.email}`);
      user.lastLogin = new Date();
      await user.save();
    }

    // Return user profile
    ResponseHandler.success(
      res,
      { user: user.toPublicProfile() },
      'Token verified successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 * GET /auth/current-user
 */
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_MISSING);
    }

    // Get full user from database
    const user = await userService.getUserByFirebaseUid(req.user.uid);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    ResponseHandler.success(
      res,
      { user: user.toPublicProfile() },
      'User profile retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Check authentication status
 * GET /auth/status
 */
export const checkAuthStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      // Not authenticated
      ResponseHandler.success(
        res,
        { authenticated: false, user: null },
        'Not authenticated'
      );
      return;
    }

    // Get user from database
    const user = await userService.getUserByFirebaseUid(req.user.uid);

    if (!user) {
      ResponseHandler.success(
        res,
        { authenticated: false, user: null },
        'User not found'
      );
      return;
    }

    ResponseHandler.success(
      res,
      { authenticated: true, user: user.toPublicProfile() },
      'Authenticated'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Logout (placeholder - client-side handles Firebase logout)
 * POST /auth/logout
 */
export const logout = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ResponseHandler.success(
      res,
      { success: true },
      'Logged out successfully'
    );
  } catch (error) {
    next(error);
  }
};
