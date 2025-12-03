/**
 * Diagnostic utilities for troubleshooting authentication issues
 * SIMPLIFIED: Client-side auth only, no Firebase verification
 */

const User = require('../users/user.Model');
const logger = require('./logger');

/**
 * Diagnose authentication issues (simplified for client-side auth)
 * This helps identify basic auth setup issues
 */
const diagnoseAuth = async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    mode: 'CLIENT_SIDE_AUTH_ONLY',
    headers: {},
    firebaseToken: null,
    user: null,
    errors: [],
    notice: 'Backend does NOT verify Firebase tokens - client handles all auth',
  };

  try {
    // 1. Check Authorization Header
    const authHeader = req.headers.authorization;
    diagnostics.headers.authorization = authHeader ? 'Present' : 'Missing';
    diagnostics.headers.contentType = req.headers['content-type'];
    diagnostics.headers.origin = req.headers.origin;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      diagnostics.errors.push('Authorization header missing or malformed');
      return res.json({ success: false, diagnostics });
    }

    const idToken = authHeader.split('Bearer ')[1];
    diagnostics.headers.tokenLength = idToken ? idToken.length : 0;

    // 2. Decode Token (NO VERIFICATION)
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
      diagnostics.firebaseToken = {
        uid: decodedToken.uid || decodedToken.user_id,
        email: decodedToken.email,
        name: decodedToken.name,
        decoded: 'Token decoded without verification (client-side auth)',
      };
    } catch (decodeError) {
      diagnostics.errors.push({
        step: 'Token decode',
        error: decodeError.message,
      });
      return res.json({ success: false, diagnostics });
    }

    // 3. Check user in database
    try {
      const user = await User.findOne({ firebaseUid: diagnostics.firebaseToken.uid });
      
      if (!user) {
        diagnostics.errors.push({
          step: 'Database lookup',
          error: 'User not found in database',
          firebaseUid: diagnostics.firebaseToken.uid,
        });
      } else {
        diagnostics.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          status: user.status,
          department: user.department,
          hasCompletedProfile: !!(user.department && user.phoneNumber),
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        };

        // Check status issues
        if (user.status === 'pending') {
          diagnostics.errors.push({
            step: 'User status check',
            error: 'Account is pending approval',
          });
        }
        if (user.status === 'suspended') {
          diagnostics.errors.push({
            step: 'User status check',
            error: 'Account is suspended',
          });
        }
      }
    } catch (dbError) {
      diagnostics.errors.push({
        step: 'Database query',
        error: dbError.message,
      });
    }

    // 4. Summary
    diagnostics.summary = {
      canAuthenticate: diagnostics.errors.length === 0,
      issues: diagnostics.errors.length,
    };

    res.json({
      success: diagnostics.errors.length === 0,
      diagnostics,
    });
  } catch (error) {
    logger.error('[Diagnostics] Error running diagnostics', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      diagnostics,
      error: error.message,
    });
  }
};

module.exports = {
  diagnoseAuth,
};
