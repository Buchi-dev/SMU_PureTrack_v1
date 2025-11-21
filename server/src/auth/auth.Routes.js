const express = require('express');
const { verifyIdToken, getFirebaseUser } = require('../configs/firebase.Config');
const { authenticateFirebase, optionalAuth } = require('./auth.Middleware');
const User = require('../users/user.Model');
const logger = require('../utils/logger');

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

    // Verify Firebase token
    const decodedToken = await verifyIdToken(idToken);
    
    // Get Firebase user data
    const firebaseUser = await getFirebaseUser(decodedToken.uid);

    // Check if user exists in database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // Create new user
      user = new User({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || firebaseUser.email,
        displayName: decodedToken.name || firebaseUser.displayName || 'User',
        firstName: decodedToken.name?.split(' ')[0] || '',
        lastName: decodedToken.name?.split(' ').slice(1).join(' ') || '',
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
