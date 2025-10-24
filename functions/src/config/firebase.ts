import * as admin from "firebase-admin";
import {PubSub} from "@google-cloud/pubsub";
import {setGlobalOptions} from "firebase-functions/v2";

// Initialize Firebase Admin
admin.initializeApp();

export const db = admin.firestore();
export const rtdb = admin.database();
export const pubsub = new PubSub();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "512MiB",
});
