/**
 * Firestore Trigger: Sync User Custom Claims
 * Automatically synchronizes Firebase Auth custom claims when user status/role changes in Firestore
 *
 * This trigger eliminates the need for manual custom claims updates in callable functions.
 * Whenever a user document is updated in Firestore, this function checks if the role or
 * status fields have changed and automatically updates the custom claims in Firebase Auth.
 *
 * @module firestore/syncUserClaims
 */

import * as admin from "firebase-admin";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";

import {COLLECTIONS} from "../constants/database.constants";
import type {UserStatus, UserRole} from "../constants/User.Constants";
import {withErrorHandling} from "../utils/ErrorHandlers";

/**
 * Firestore Trigger: User Document Updated
 *
 * Listens for changes to user documents and syncs custom claims
 * when role or status fields are modified.
 */
export const syncUserClaims = onDocumentUpdated(
  {
    document: `${COLLECTIONS.USERS}/{userId}`,
    region: "us-central1",
  },
  async (event) => {
    const userId = event.params.userId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Guard: Ensure both before and after data exist
    if (!beforeData || !afterData) {
      console.warn(`[SYNC-CLAIMS] Missing data for user ${userId}`);
      return;
    }

    const roleBefore = beforeData.role as UserRole | undefined;
    const roleAfter = afterData.role as UserRole | undefined;
    const statusBefore = beforeData.status as UserStatus | undefined;
    const statusAfter = afterData.status as UserStatus | undefined;

    // Check if role or status changed
    const roleChanged = roleBefore !== roleAfter;
    const statusChanged = statusBefore !== statusAfter;

    // If neither changed, no need to update claims
    if (!roleChanged && !statusChanged) {
      return;
    }

    console.log(
      `[SYNC-CLAIMS] User ${userId} - Role: ${roleBefore} → ${roleAfter}, Status: ${statusBefore} → ${statusAfter}`
    );

    // Update custom claims in Firebase Auth
    await withErrorHandling(
      async () => {
        const customClaims: Record<string, string> = {};

        if (roleAfter) {
          customClaims.role = roleAfter;
        }

        if (statusAfter) {
          customClaims.status = statusAfter;
        }

        await admin.auth().setCustomUserClaims(userId, customClaims);

        console.log(
          `[SYNC-CLAIMS] Successfully updated custom claims for user ${userId}`
        );
      },
      "syncing custom claims",
      `Failed to sync custom claims for user ${userId}`
    );
  }
);
