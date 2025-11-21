const admin = require('firebase-admin');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Configure Firebase Admin SDK
 * Used for verifying Firebase Auth tokens on the backend
 */
const configureFirebase = () => {
  try {
    let serviceAccount;

    // Check if service account is provided as environment variable (for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } 
    // Otherwise load from file path
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const accountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      serviceAccount = require(accountPath);
    } 
    else {
      throw new Error('Neither FIREBASE_SERVICE_ACCOUNT nor FIREBASE_SERVICE_ACCOUNT_PATH is set');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    logger.info('[Firebase] Admin SDK initialized successfully');
  } catch (error) {
    logger.error('[Firebase] Failed to initialize Admin SDK', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<Object>} - Decoded token with user info
 */
const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.error('[Firebase] Token verification failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get user by UID from Firebase
 * @param {string} uid - Firebase user UID
 * @returns {Promise<Object>} - Firebase user record
 */
const getFirebaseUser = async (uid) => {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error) {
    logger.error('[Firebase] Failed to get user', {
      uid,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Create custom token for user
 * @param {string} uid - Firebase user UID
 * @param {Object} claims - Additional custom claims
 * @returns {Promise<string>} - Custom token
 */
const createCustomToken = async (uid, claims = {}) => {
  try {
    const customToken = await admin.auth().createCustomToken(uid, claims);
    return customToken;
  } catch (error) {
    logger.error('[Firebase] Failed to create custom token', {
      uid,
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  configureFirebase,
  verifyIdToken,
  getFirebaseUser,
  createCustomToken,
  admin,
};
