/**
 * Firebase Configuration
 * Initialize Firebase SDK for client-side authentication
 */

import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// Firebase configuration
// Replace these values with your actual Firebase project credentials
// You can find these in Firebase Console > Project Settings > General
const firebaseConfig = {
  apiKey: "AIzaSyDAwRnWPlb54lWqk6r0nNKIstJif1R7oxM",
  authDomain: "my-app-da530.firebaseapp.com",
  databaseURL: "https://my-app-da530-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-app-da530",
  storageBucket: "my-app-da530.firebasestorage.app",
  messagingSenderId: "8158575421",
  appId: "1:8158575421:web:d4a32e4212ff393341a354",
  measurementId: "G-7J869G2ZPE"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  console.log("✓ Firebase initialized successfully");
  
  // Initialize Firebase Authentication
  auth = getAuth(app);
  
  // Initialize Firestore
  db = getFirestore(app);
  
  // Log current environment
  console.log("Firebase Auth Domain:", firebaseConfig.authDomain);
  console.log("Current URL:", window.location.origin);
  
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
  throw error;
}

export { app, auth, db };
