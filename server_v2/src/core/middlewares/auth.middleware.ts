/**
 * Authentication Middleware
 * 
 * Firebase JWT token verification and role-based access control
 * 
 * @module core/middlewares/auth.middleware
 */

import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { UnauthorizedError, ForbiddenError } from '@utils/errors.util';
import { ERROR_MESSAGES } from '@core/configs/messages.config';
import { UserRole } from '@feature/users/user.types';
import { userService } from '@feature/users';

/**
 * Extended Request interface with user
 */
export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    userId: string;
  };
}

/**
 * Verify Firebase ID token and attach user to request
 */
export const requireAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_MISSING);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user from database
    const user = await userService.getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID);
    }

    // Attach user to request
    req.user = {
      uid: user.firebaseUid || decodedToken.uid,
      email: user.email,
      name: user.displayName,
      role: user.role,
      userId: user._id.toString(),
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      next(error);
    } else if ((error as any).code === 'auth/id-token-expired') {
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_EXPIRED));
    } else if ((error as any).code === 'auth/argument-error') {
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID));
    } else {
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID));
    }
  }
};

/**
 * Require admin role
 */
export const requireAdmin = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First verify authentication
    if (!req.user) {
      throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_MISSING);
    }

    // Check role
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenError(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require staff role (staff or admin)
 */
export const requireStaff = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First verify authentication
    if (!req.user) {
      throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_MISSING);
    }

    // Check role
    if (req.user.role !== UserRole.STAFF && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenError(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 * Useful for endpoints that work differently for authenticated users
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, continue without user
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await userService.getUserByFirebaseUid(decodedToken.uid);

    if (user) {
      req.user = {
        uid: user.firebaseUid || decodedToken.uid,
        email: user.email,
        name: user.displayName,
        role: user.role,
        userId: user._id.toString(),
      };
    }

    next();
  } catch (error) {
    // Don't throw error, just continue without user
    next();
  }
};
