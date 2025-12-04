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
import { CompleteAccountData } from './auth.validation';
import { UserStatus } from '@feature/users/user.types';

/**
 * Verify Firebase ID token
 * Does NOT create user in database - only verifies Firebase token
 * Returns requiresAccountCompletion flag if user doesn't exist in database
 * 
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

    // Check if user exists in database
    const user = await userService.getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      // User authenticated with Firebase but doesn't exist in database
      // Return flag indicating account completion is required
      logInfo(`[Auth] User authenticated but not in database: ${decodedToken.email}`);
      ResponseHandler.success(
        res,
        { 
          requiresAccountCompletion: true,
          firebaseEmail: decodedToken.email,
          firebaseUid: decodedToken.uid,
          displayName: decodedToken.name || decodedToken.email.split('@')[0],
          profilePicture: decodedToken.picture
        },
        'Account completion required'
      );
      return;
    }

    // User exists, update last login and return profile
    logInfo(`[Auth] User exists, updating last login: ${decodedToken.email}`);
    user.lastLogin = new Date();
    await user.save();

    // Return user profile
    ResponseHandler.success(
      res,
      { 
        requiresAccountCompletion: false,
        user: user.toPublicProfile() 
      },
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
 * Complete account registration
 * Creates user in database after Firebase authentication
 * Requires valid Firebase token in Authorization header
 * 
 * POST /auth/complete-account
 */
export const completeAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.substring(7);
    const decodedToken = await getFirebaseAuth().verifyIdToken(token);

    // Verify domain
    if (!decodedToken.email?.endsWith('@smu.edu.ph')) {
      throw new UnauthorizedError('Only @smu.edu.ph email addresses are allowed');
    }

    logInfo(`[Auth] Completing account for: ${decodedToken.email}`);

    // Check if user already exists
    const existingUser = await userService.getUserByFirebaseUid(decodedToken.uid);
    if (existingUser) {
      logInfo(`[Auth] User already exists: ${decodedToken.email}`);
      ResponseHandler.success(
        res,
        { user: existingUser.toPublicProfile() },
        'User already exists'
      );
      return;
    }

    // Extract account completion data from request body
    const accountData: CompleteAccountData = req.body;

    // Create user with complete profile
    const newUser = await userService.createUser({
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || `${accountData.firstName} ${accountData.lastName}`,
      firstName: accountData.firstName,
      lastName: accountData.lastName,
      middleName: accountData.middleName || undefined,
      department: accountData.department,
      phoneNumber: accountData.phoneNumber,
      profilePicture: decodedToken.picture,
      provider: 'google' as any,
      role: accountData.roleRequest as any, // Store requested role
      status: UserStatus.PENDING, // New users start as pending for admin approval
      notificationPreferences: accountData.notificationPreferences,
    });

    logInfo(`[Auth] Account completed for user ID: ${newUser._id}`);

    ResponseHandler.success(
      res,
      { user: newUser.toPublicProfile() },
      'Account registration completed successfully. Your account is pending admin approval.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Check authentication status
 * Returns authentication status and user data if available
 * If Firebase authenticated but no database record, returns requiresAccountCompletion flag
 * 
 * GET /auth/status
 */
export const checkAuthStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      // Not authenticated with Firebase
      ResponseHandler.success(
        res,
        { authenticated: false, user: null, requiresAccountCompletion: false },
        'Not authenticated'
      );
      return;
    }

    // Firebase authenticated - check if user exists in database
    const user = await userService.getUserByFirebaseUid(req.user.uid);

    if (!user) {
      // Firebase authenticated but no database record
      // User needs to complete account registration
      ResponseHandler.success(
        res,
        { 
          authenticated: true, 
          requiresAccountCompletion: true,
          user: null,
          firebaseEmail: req.user.email,
          firebaseUid: req.user.uid
        },
        'Account completion required'
      );
      return;
    }

    // User exists in database
    ResponseHandler.success(
      res,
      { 
        authenticated: true, 
        requiresAccountCompletion: false,
        user: user.toPublicProfile() 
      },
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
