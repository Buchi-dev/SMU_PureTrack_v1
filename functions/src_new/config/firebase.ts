/**
 * Firebase Configuration and Initialization
 * Centralized Firebase Admin SDK setup
 *
 * @module config/firebase
 */

import {PubSub} from "@google-cloud/pubsub";
import * as admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";

// ===========================
// FIREBASE INITIALIZATION
// ===========================

/**
 * Initialize Firebase Admin SDK
 * Checks if already initialized to avoid duplicate initialization
 */
if (!admin.apps.length) {
  admin.initializeApp();
}

// ===========================
// DATABASE INSTANCES
// ===========================

/**
 * Firestore database instance
 * Used for structured document-based data storage
 */
export const db = admin.firestore();

/**
 * Realtime Database instance
 * Used for real-time sensor data and device status
 */
export const rtdb = admin.database();

/**
 * Pub/Sub client instance
 * Used for device command publishing and MQTT bridge
 */
export const pubsub = new PubSub();

// ===========================
// GLOBAL FUNCTION SETTINGS
// ===========================

/**
 * Set global options for all Firebase Functions v2
 * These settings apply to all functions unless overridden
 */
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "512MiB",
});

// ===========================
// RE-EXPORT COLLECTION CONSTANTS
// ===========================

/**
 * Re-export collection names for convenience
 * Import from constants/database.constants for primary usage
 */
export {COLLECTIONS} from "../constants/database.constants";
