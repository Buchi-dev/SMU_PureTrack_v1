/**
 * Firebase Configuration
 * Initialize Firebase SDK for client-side authentication
 * 
 * SECURITY: Configuration values should be stored in environment variables
 * See .env.example for required configuration
 */

import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// Firebase configuration from environment variables
// These are injected at build time by Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate required configuration
function validateFirebaseConfig() {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(
    field => !firebaseConfig[field as keyof typeof firebaseConfig]
  );

  if (missingFields.length > 0) {
    console.error('❌ Missing Firebase configuration:', missingFields);
    console.error('Please check your .env file and ensure all required variables are set.');
    console.error('See .env.example for the required configuration.');
    throw new Error('Firebase configuration incomplete');
  }
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  // Validate configuration before initializing
  validateFirebaseConfig();

  app = initializeApp(firebaseConfig);
  console.log("✓ Firebase initialized successfully");
  
  // Initialize Firebase Authentication
  auth = getAuth(app);
  
  // Initialize Firestore
  db = getFirestore(app);
  
  // Log current environment (for debugging)
  if (import.meta.env.DEV) {
    console.log("Firebase Auth Domain:", firebaseConfig.authDomain);
    console.log("Current URL:", window.location.origin);
    console.log("Project ID:", firebaseConfig.projectId);
  }
  
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
  throw error;
}

export { app, auth, db };
