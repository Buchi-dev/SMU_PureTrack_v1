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

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logger.info('[Firebase] Initialized ✓');
    } else {
      logger.info('[Firebase] Admin SDK initialized successfully');
    }
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
    // Validate token is not empty
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid token: Token must be a non-empty string');
    }
    
    // Log verification attempt
    logger.info('[Firebase] Verifying ID token', {
      tokenLength: idToken.length,
      tokenPrefix: idToken.substring(0, 20) + '...',
    });
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    logger.info('[Firebase] Token verified successfully', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      aud: decodedToken.aud,
      iss: decodedToken.iss,
    });
    
    return decodedToken;
  } catch (error) {
    // Log detailed error information
    logger.error('[Firebase] Token verification failed', {
      error: error.message,
      errorCode: error.code,
      errorStack: error.stack,
    });
    
    // Check for specific permission errors
    if (error.message && error.message.includes('serviceusage.services.use')) {
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.error('🔥 FIREBASE SERVICE ACCOUNT PERMISSION ERROR 🔥');
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.error('The service account needs additional permissions.');
      logger.error('Required IAM Roles:');
      logger.error('1. Service Account Token Creator');
      logger.error('2. Firebase Admin SDK Administrator Service Agent');
      logger.error('3. Service Usage Consumer');
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    
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
