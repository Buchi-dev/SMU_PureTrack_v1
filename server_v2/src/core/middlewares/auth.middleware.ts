/**
 * Authentication Middleware
 * 
 * Firebase JWT token verification and role-based access control
 * 
 * @module core/middlewares/auth.middleware
 */

import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '@core/configs';
import { UnauthorizedError, ForbiddenError } from '@utils/errors.util';
import { ERROR_MESSAGES } from '@core/configs/messages.config';
import { UserRole } from '@feature/users/user.types';
import userService from '@feature/users/user.service';

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
    const decodedToken = await getFirebaseAuth().verifyIdToken(token);

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
 * This middleware ALSO handles authentication (extracts token and verifies it)
 */
export const requireAdmin = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // FIRST: Extract and verify token if not already done
    if (!req.user) {
      console.log('[AUTH] requireAdmin - No req.user found, extracting token...');
      console.log('[AUTH] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('[AUTH] Authorization header:', req.headers.authorization);
      
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('[AUTH] requireAdmin - No valid Authorization header found');
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_MISSING);
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('[AUTH] Extracted token (first 20 chars):', token.substring(0, 20) + '...');

      // Verify token with Firebase
      const decodedToken = await getFirebaseAuth().verifyIdToken(token);
      console.log('[AUTH] Token verified for Firebase UID:', decodedToken.uid);

      // Get user from database
      const user = await userService.getUserByFirebaseUid(decodedToken.uid);

      if (!user) {
        console.error('[AUTH] User not found in database for Firebase UID:', decodedToken.uid);
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID);
      }

      console.log('[AUTH] User found:', user.email, 'Role:', user.role);

      // Attach user to request
      req.user = {
        uid: user.firebaseUid || decodedToken.uid,
        email: user.email,
        name: user.displayName,
        role: user.role,
        userId: user._id.toString(),
      };
    }

    // SECOND: Check role
    if (req.user.role !== UserRole.ADMIN) {
      console.error('[AUTH] Insufficient permissions. User role:', req.user.role);
      throw new ForbiddenError(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS);
    }

    console.log('[AUTH] requireAdmin - Access granted for:', req.user.email);
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      next(error);
    } else if ((error as any).code === 'auth/id-token-expired') {
      console.error('[AUTH] Token expired');
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_EXPIRED));
    } else if ((error as any).code === 'auth/argument-error') {
      console.error('[AUTH] Invalid token argument');
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID));
    } else {
      console.error('[AUTH] Token verification error:', error);
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID));
    }
  }
};

/**
 * Require staff role (staff or admin)
 * This middleware ALSO handles authentication (extracts token and verifies it)
 */
export const requireStaff = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // FIRST: Extract and verify token if not already done
    if (!req.user) {
      console.log('[AUTH] requireStaff - No req.user found, extracting token...');
      console.log('[AUTH] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('[AUTH] Authorization header:', req.headers.authorization);
      
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('[AUTH] requireStaff - No valid Authorization header found');
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_MISSING);
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('[AUTH] Extracted token (first 20 chars):', token.substring(0, 20) + '...');

      // Verify token with Firebase
      const decodedToken = await getFirebaseAuth().verifyIdToken(token);
      console.log('[AUTH] Token verified for Firebase UID:', decodedToken.uid);

      // Get user from database
      const user = await userService.getUserByFirebaseUid(decodedToken.uid);

      if (!user) {
        console.error('[AUTH] User not found in database for Firebase UID:', decodedToken.uid);
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID);
      }

      console.log('[AUTH] User found:', user.email, 'Role:', user.role);

      // Attach user to request
      req.user = {
        uid: user.firebaseUid || decodedToken.uid,
        email: user.email,
        name: user.displayName,
        role: user.role,
        userId: user._id.toString(),
      };
    }

    // SECOND: Check role
    if (req.user.role !== UserRole.STAFF && req.user.role !== UserRole.ADMIN) {
      console.error('[AUTH] Insufficient permissions. User role:', req.user.role);
      throw new ForbiddenError(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS);
    }

    console.log('[AUTH] requireStaff - Access granted for:', req.user.email);
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      next(error);
    } else if ((error as any).code === 'auth/id-token-expired') {
      console.error('[AUTH] Token expired');
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_EXPIRED));
    } else if ((error as any).code === 'auth/argument-error') {
      console.error('[AUTH] Invalid token argument');
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID));
    } else {
      console.error('[AUTH] Token verification error:', error);
      next(new UnauthorizedError(ERROR_MESSAGES.AUTH.TOKEN_INVALID));
    }
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 * Useful for endpoints that work differently for authenticated users
 * Sets req.user with Firebase data even if user doesn't exist in database
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
    const decodedToken = await getFirebaseAuth().verifyIdToken(token);
    const user = await userService.getUserByFirebaseUid(decodedToken.uid);

    if (user) {
      // User exists in database - use database data
      req.user = {
        uid: user.firebaseUid || decodedToken.uid,
        email: user.email,
        name: user.displayName,
        role: user.role,
        userId: user._id.toString(),
      };
    } else {
      // User authenticated with Firebase but not in database - use Firebase data
      // Role will be assigned when they complete account registration
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || '',
        role: UserRole.STAFF, // Temporary role until account completion
        userId: '', // No database ID yet
      };
    }

    next();
  } catch (error) {
    // Don't throw error, just continue without user
    next();
  }
};
