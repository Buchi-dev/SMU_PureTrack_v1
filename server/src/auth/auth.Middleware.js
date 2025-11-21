const { verifyIdToken } = require('../configs/firebase.Config');
const User = require('../users/user.Model');
const logger = require('../utils/logger');

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID token and attaches user to request
 */
const authenticateFirebase = async (req, res, next) => {
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

    // Check user status
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Account pending approval',
      });
    }

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
  return (req, res, next) => {
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

    if (user && user.status === 'active') {
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

module.exports = {
  authenticateFirebase,
  ensureAuthenticated,
  ensureRole,
  ensureAdmin,
  ensureStaff,
  optionalAuth,
};