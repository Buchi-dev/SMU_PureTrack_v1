const { verifyIdToken } = require('../configs/firebase.Config');
const User = require('../users/user.Model');
const logger = require('../utils/logger');
const { AuthenticationError, NotFoundError } = require('../errors');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID token and attaches user to request
 */
const authenticateFirebase = asyncHandler(async (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('[Auth Middleware] No authorization header', {
      path: req.path,
      hasHeader: !!authHeader,
    });
    throw AuthenticationError.missingToken();
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken || idToken.trim() === '') {
    logger.warn('[Auth Middleware] Empty token', { path: req.path });
    throw AuthenticationError.missingToken();
  }

  // Verify Firebase token
  let decodedToken;
  try {
    logger.info('[Auth Middleware] Attempting to verify token', {
      tokenPrefix: idToken.substring(0, 20) + '...',
      tokenLength: idToken.length,
      path: req.path,
    });
    
    decodedToken = await verifyIdToken(idToken);
    
    logger.info('[Auth Middleware] Token verified successfully', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      path: req.path,
    });
  } catch (tokenError) {
    logger.error('[Auth Middleware] Firebase token verification failed', {
      error: tokenError.message,
      errorCode: tokenError.code,
      tokenPrefix: idToken.substring(0, 20) + '...',
      path: req.path,
    });
    
    // Provide more specific error messages
    if (tokenError.code === 'auth/id-token-expired') {
      throw AuthenticationError.expiredToken();
    }
    
    if (tokenError.code === 'auth/argument-error') {
      throw AuthenticationError.invalidToken('Invalid token format');
    }
    
    throw AuthenticationError.invalidToken(
      process.env.NODE_ENV === 'development' ? tokenError.message : undefined
    );
  }
  
  // Get user from database using Firebase UID
  const user = await User.findOne({ firebaseUid: decodedToken.uid });

  if (!user) {
    logger.warn('[Auth Middleware] User not found in database', {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      path: req.path,
    });
    throw new NotFoundError('User', decodedToken.uid);
  }

  // Check user status
  if (user.status === 'suspended') {
    logger.warn('[Auth Middleware] Suspended user access attempt', {
      userId: user._id,
      email: user.email,
      path: req.path,
    });
    throw AuthenticationError.accountSuspended();
  }

  if (user.status === 'pending') {
    logger.warn('[Auth Middleware] Pending user access attempt', {
      userId: user._id,
      email: user.email,
      path: req.path,
    });
    throw AuthenticationError.accountPending();
  }

  // Attach user and Firebase token to request
  req.user = user;
  req.firebaseUser = decodedToken;
  
  logger.info('[Auth Middleware] Authentication successful', {
    userId: user._id,
    email: user.email,
    role: user.role,
    status: user.status,
    path: req.path,
  });
  
  next();
});

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const ensureAuthenticated = authenticateFirebase;

/**
 * Middleware to check if user has specific role  
 * @param {...string} roles - Allowed roles       
 * @returns {Function} Express middleware function
 */
const ensureRole = (...roles) => {
  return async (req, res, next) => {
    // First authenticate the user
    try {
      await authenticateFirebase(req, res, async () => {
        // After authentication, check role
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
          });
        }

        if (!roles.includes(req.user.role)) {
          logger.warn('[Auth Middleware] Unauthorized access attempt', {
            userId: req.user._id,
            userRole: req.user.role,
            requiredRoles: roles,
            path: req.path,
          });

          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
          });
        }

        next();
      });
    } catch (error) {
      logger.error('[Auth Middleware] Role check error', {
        error: error.message,
        path: req.path,
      });
      
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for public endpoints that can show different data if authenticated
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    // Attach user regardless of status for status checks
    // This allows frontend to handle pending/suspended states properly
    if (user) {
      req.user = user;
      req.firebaseUser = decodedToken;
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

/**
 * Middleware to check if user is admin
 */
const ensureAdmin = ensureRole('admin');

/**
 * Middleware to check if user is staff or admin
 */
const ensureStaff = ensureRole('admin', 'staff');

/**
 * Authentication middleware that allows pending users
 * Used for endpoints like profile completion where pending users need access
 */
const authenticatePendingAllowed = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify Firebase token
    const decodedToken = await verifyIdToken(idToken);
    
    // Get user from database using Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check user status - only block suspended users
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
      });
    }

    // Allow pending users through (they need to complete their profile)
    // Attach user and Firebase token to request
    req.user = user;
    req.firebaseUser = decodedToken;
    
    next();
  } catch (error) {
    logger.error('[Auth Middleware] Authentication failed', {
      error: error.message,
      path: req.path,
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

module.exports = {
  authenticateFirebase,
  ensureAuthenticated,
  ensureRole,
  ensureAdmin,
  ensureStaff,
  optionalAuth,
  authenticatePendingAllowed,
};