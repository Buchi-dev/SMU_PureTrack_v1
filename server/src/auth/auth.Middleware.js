const User = require('../users/user.Model');
const logger = require('../utils/logger');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Pass-through Authentication Middleware
 * All authentication handled on client side via Firebase
 */
const authenticateFirebase = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString('utf-8')
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const decodedToken = JSON.parse(jsonPayload);
      const uid = decodedToken.uid || decodedToken.user_id;
      
      const user = await User.findOne({ firebaseUid: uid });
      if (user) {
        req.user = user;
        req.firebaseUser = decodedToken;
      }
    } catch (error) {
      // Continue without user context
    }
  }
  
  next();
});

const ensureAuthenticated = authenticateFirebase;
const ensureRole = () => (req, res, next) => next();
const optionalAuth = (req, res, next) => next();
const ensureAdmin = ensureRole();
const authenticatePendingAllowed = (req, res, next) => next();

module.exports = {
  authenticateFirebase,
  ensureAuthenticated,
  ensureRole,
  ensureAdmin,
  optionalAuth,
  authenticatePendingAllowed,
};