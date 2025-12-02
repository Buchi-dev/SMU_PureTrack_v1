const admin = require('firebase-admin');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Validate service account structure
 * @param {Object} serviceAccount - Firebase service account JSON
 * @throws {Error} If service account is invalid
 */
const validateServiceAccount = (serviceAccount) => {
  const requiredFields = [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri',
  ];

  const missingFields = requiredFields.filter(field => !serviceAccount[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Invalid service account: missing fields [${missingFields.join(', ')}]`);
  }

  // Validate private key format
  if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Invalid service account: private_key appears to be corrupted or invalid');
  }

  // Check if key ID looks valid (should be a hex string)
  if (!/^[a-f0-9]{40}$/i.test(serviceAccount.private_key_id)) {
    logger.warn('[Firebase] Service account private_key_id format is unusual - may indicate an issue');
  }

  return true;
};

/**
 * Configure Firebase Admin SDK
 * Used for verifying Firebase Auth tokens on the backend
 */
const configureFirebase = () => {
  try {
    let serviceAccount;

    // Check if service account is provided as environment variable (for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (parseError) {
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT: ${parseError.message}`);
      }
    } 
    // Otherwise load from file path
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const accountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      try {
        serviceAccount = require(accountPath);
      } catch (loadError) {
        throw new Error(`Failed to load service account from ${accountPath}: ${loadError.message}`);
      }
    } 
    else {
      throw new Error('Neither FIREBASE_SERVICE_ACCOUNT nor FIREBASE_SERVICE_ACCOUNT_PATH is set');
    }

    // Validate service account structure
    validateServiceAccount(serviceAccount);

    // Verify project ID matches
    if (process.env.FIREBASE_PROJECT_ID && serviceAccount.project_id !== process.env.FIREBASE_PROJECT_ID) {
      logger.warn('[Firebase] FIREBASE_PROJECT_ID env var does not match service account project_id', {
        envProjectId: process.env.FIREBASE_PROJECT_ID,
        serviceAccountProjectId: serviceAccount.project_id,
      });
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logger.info('[Firebase] Initialized ✓');
      logger.info(`[Firebase] Project: ${serviceAccount.project_id}`);
      logger.info(`[Firebase] Key ID: ${serviceAccount.private_key_id.substring(0, 8)}...`);
    } else {
      logger.info('[Firebase] Admin SDK initialized successfully');
      logger.info(`[Firebase] Project: ${serviceAccount.project_id}`);
      logger.info(`[Firebase] Service Account: ${serviceAccount.client_email}`);
      logger.info(`[Firebase] Key ID: ${serviceAccount.private_key_id}`);
    }
  } catch (error) {
    logger.error('[Firebase] Failed to initialize Admin SDK', {
      error: error.message,
    });
    
    // Provide helpful troubleshooting information
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('🔥 FIREBASE INITIALIZATION FAILED 🔥');
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('Common causes:');
    logger.error('1. Service account JSON is invalid or corrupted');
    logger.error('2. Service account key has been revoked or rotated');
    logger.error('3. Environment variable not properly set');
    logger.error('4. Server time is not synchronized (causes JWT signature errors)');
    logger.error('');
    logger.error('Solutions:');
    logger.error('1. Verify FIREBASE_SERVICE_ACCOUNT env var is set correctly');
    logger.error('2. Generate new service account key: https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk');
    logger.error('3. Ensure server time is synced (Docker: check host time)');
    logger.error('4. Check service account has required IAM roles');
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
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
    
    // Only log verification attempts in verbose mode
    if (process.env.VERBOSE_LOGGING === 'true') {
      logger.info('[Firebase] Verifying ID token', {
        tokenLength: idToken.length,
        tokenPrefix: idToken.substring(0, 20) + '...',
      });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Only log successful verification in verbose mode
    if (process.env.VERBOSE_LOGGING === 'true') {
      logger.info('[Firebase] Token verified', {
        uid: decodedToken.uid,
        email: decodedToken.email,
      });
    }
    
    return decodedToken;
  } catch (error) {
    // Always log errors
    logger.error('[Firebase] Token verification failed', {
      error: error.message,
      errorCode: error.code,
    });
    
    // Check for Invalid JWT Signature error (time sync issue)
    if (error.message && error.message.includes('Invalid JWT Signature')) {
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.error('🔥 FIREBASE JWT SIGNATURE ERROR - TIME SYNC ISSUE 🔥');
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.error('This error occurs when server time is not synchronized.');
      logger.error('');
      logger.error('Current server time: ' + new Date().toISOString());
      logger.error('Current timestamp: ' + Math.floor(Date.now() / 1000));
      logger.error('');
      logger.error('Solutions:');
      logger.error('1. Docker/Cloud: Restart container to sync with host time');
      logger.error('2. Check host system time is correct');
      logger.error('3. Ensure NTP service is running (chrony/ntpd)');
      logger.error('4. Verify timezone is set correctly (should be UTC in containers)');
      logger.error('5. If using Docker, ensure host has time sync enabled');
      logger.error('');
      logger.error('Commands to check/fix:');
      logger.error('  - Check time: date -u');
      logger.error('  - Sync time (Linux): sudo ntpdate pool.ntp.org');
      logger.error('  - Restart Docker: sudo systemctl restart docker');
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    // Check for revoked/invalid service account key
    else if (error.message && error.message.includes('invalid_grant')) {
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.error('🔥 FIREBASE INVALID GRANT ERROR 🔥');
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.error('Service account key may be revoked or invalid.');
      logger.error('');
      logger.error('Solutions:');
      logger.error('1. Generate new service account key:');
      logger.error('   https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk');
      logger.error('2. Update FIREBASE_SERVICE_ACCOUNT environment variable');
      logger.error('3. Verify key ID still exists in Firebase Console');
      logger.error('4. Ensure service account has required permissions');
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    // Check for specific permission errors
    else if (error.message && error.message.includes('serviceusage.services.use')) {
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
  admin,
};
