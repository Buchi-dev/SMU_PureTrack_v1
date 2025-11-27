const express = require('express');
const { verifyIdToken, getFirebaseUser } = require('../configs/firebase.Config');
const { authenticateFirebase, optionalAuth } = require('./auth.Middleware');
const User = require('../users/user.Model');
const logger = require('../utils/logger');
const { AuthenticationError } = require('../errors');

const router = express.Router();

/**
 * @route   POST /auth/verify-token
 * @desc    Verify Firebase ID token and sync user to database
 * @access  Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required',
      });
    }

    // Verify Firebase token FIRST (fast operation)
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (verifyError) {
      logger.error('[Auth] Firebase token verification failed', {
        error: verifyError.message,
        errorCode: verifyError.code,
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Firebase token',
        errorCode: 'AUTH_TOKEN_INVALID',
      });
    }

    // IMMEDIATE domain validation BEFORE any database operations
    // This prevents timeouts for unauthorized users
    const userEmail = decodedToken.email;
    if (!userEmail || !userEmail.endsWith('@smu.edu.ph')) {
      logger.warn('[Auth] Domain validation failed - personal account rejected', {
        email: userEmail,
        requiredDomain: '@smu.edu.ph',
      });
      
      // Return 403 Forbidden with specific error code
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed. Personal accounts are not permitted.',
        errorCode: 'AUTH_INVALID_DOMAIN',
        metadata: {
          email: userEmail,
          requiredDomain: '@smu.edu.ph',
        },
      });
    }

    // Get Firebase user data only AFTER domain validation
    const firebaseUser = await getFirebaseUser(decodedToken.uid);

    // Check if user exists in database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // Parse name components
      const fullName = decodedToken.name || firebaseUser.displayName || 'User';
      const nameParts = fullName.trim().split(/\s+/); // Split by whitespace
      
      let firstName = '';
      let middleName = '';
      let lastName = '';
      
      if (nameParts.length === 1) {
        firstName = nameParts[0];
      } else if (nameParts.length >= 2) {
        // Last part is always the last name
        lastName = nameParts[nameParts.length - 1];
        
        // Check if second-to-last part is a middle initial (contains period)
        if (nameParts.length >= 3 && nameParts[nameParts.length - 2].includes('.')) {
          middleName = nameParts[nameParts.length - 2];
          // Everything before middle name is first name
          firstName = nameParts.slice(0, nameParts.length - 2).join(' ');
        } else {
          // No middle initial, everything before last name is first name
          firstName = nameParts.slice(0, nameParts.length - 1).join(' ');
        }
      }
      
      // Create new user
      user = new User({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || firebaseUser.email,
        displayName: fullName,
        firstName,
        middleName,
        lastName,
        profilePicture: decodedToken.picture || firebaseUser.photoURL || '',
        provider: 'firebase',
        role: 'staff', // Default role
        status: 'pending',
        lastLogin: new Date(),
      });

      await user.save();

      logger.info('[Auth] New user created', {
        userId: user._id,
        email: user.email,
      });
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info('[Auth] User logged in', {
        userId: user._id,
        email: user.email,
      });
    }

    res.json({
      success: true,
      user: user.toPublicProfile(),
      message: 'Token verified successfully',
    });
  } catch (error) {
    logger.error('[Auth] Token verification failed', {
      error: error.message,
    });

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

/**
 * @route   GET /auth/current-user
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/current-user', authenticateFirebase, (req, res) => {
  res.json({
    success: true,
    user: req.user.toPublicProfile(),
  });
});

/**
 * @route   GET /auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', optionalAuth, (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user ? req.user.toPublicProfile() : null,
  });
});

/**
 * @route   POST /auth/test-email
 * @desc    Test email configuration by sending a test email
 * @access  Public (temporarily for testing)
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const { testEmailConfiguration } = require('../utils/email.service');
    await testEmailConfiguration(email);

    res.json({
      success: true,
      message: 'Test email sent successfully. Check your inbox.',
    });
  } catch (error) {
    logger.error('Test email failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
    });
  }
});

/**
 * @route   POST /auth/logout
 * @desc    Logout user (client-side handles Firebase signOut)
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Clear Firebase session on client.',
  });
});

module.exports = router;
