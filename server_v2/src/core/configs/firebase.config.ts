/**
 * Firebase Admin SDK Configuration
 * 
 * Initializes Firebase Admin SDK for authentication and other services
 * 
 * @module core/configs/firebase.config
 */

import admin from 'firebase-admin';
import path from 'path';
import { logInfo, logError } from '@utils';

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Supports multiple initialization methods:
 * 1. Service account file (FIREBASE_SERVICE_ACCOUNT_PATH)
 * 2. Individual credentials (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)
 * 3. Default credentials (Google Cloud environments)
 */
export const initializeFirebase = (): void => {
  if (firebaseInitialized) {
    logInfo('Firebase Admin already initialized');
    return;
  }

  try {
    // Option 1: Using service account JSON file (recommended for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Resolve path relative to project root
      const serviceAccountPath = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        : path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logInfo('Firebase Admin SDK initialized with service account file');
    } 
    // Option 2: Using individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      logInfo('Firebase Admin SDK initialized with environment variables');
    }
    // Option 3: Using default credentials (for Google Cloud environments)
    else {
      admin.initializeApp();
      logInfo('Firebase Admin SDK initialized with default credentials');
    }

    firebaseInitialized = true;
    logInfo('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logError('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
};

/**
 * Get Firebase Auth instance
 * Ensures Firebase is initialized before returning auth instance
 * 
 * @returns Firebase Auth instance
 * @throws Error if Firebase is not initialized
 */
export const getFirebaseAuth = (): admin.auth.Auth => {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin SDK is not initialized. Call initializeFirebase() first.');
  }
  return admin.auth();
};

/**
 * Get Firebase Admin instance
 * 
 * @returns Firebase Admin instance
 */
export const getFirebaseAdmin = (): typeof admin => {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin SDK is not initialized. Call initializeFirebase() first.');
  }
  return admin;
};

/**
 * Check if Firebase is initialized
 * 
 * @returns True if Firebase is initialized, false otherwise
 */
export const isFirebaseInitialized = (): boolean => {
  return firebaseInitialized;
};
