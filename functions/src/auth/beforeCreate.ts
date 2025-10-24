import {beforeUserCreated} from "firebase-functions/v2/identity";
import * as admin from "firebase-admin";
import {db} from "../config/firebase";
import type {UserProfile} from "../types";

/**
 * beforeCreate — Initialize new user profile
 * Triggered when a user signs in for the first time via Google OAuth
 *
 * This function:
 * - Creates user profile in Firestore with default values
 * - Sets initial Role = "Staff" and Status = "Pending"
 * - Extracts name from Google displayName
 * - Allows user creation to proceed (they'll need approval before next sign-in)
 */
export const beforeCreate = beforeUserCreated(
  {
    region: "us-central1",
  },
  async (event) => {
    const user = event.data;

    // Guard clause for undefined user
    if (!user) {
      console.error("User data is undefined in beforeCreate");
      return;
    }

    console.log(`Creating new user profile for: ${user.email}`);

    // Extract first and last name from displayName
    const displayNameParts = (user.displayName || "").split(" ");
    const firstname = displayNameParts[0] || "";
    const lastname = displayNameParts.slice(1).join(" ") || "";

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uuid: user.uid,
      firstname,
      lastname,
      middlename: "",
      department: "",
      phoneNumber: user.phoneNumber || "",
      email: user.email || "",
      role: "Staff",
      status: "Pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await db.collection("users").doc(user.uid).set(userProfile);

      console.log(`User profile created for ${user.email} with status: Pending`);

      // Log the account creation
      await db.collection("business_logs").add({
        action: "user_created",
        uid: user.uid,
        email: user.email,
        performedBy: "system",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          role: "Staff",
          status: "Pending",
          provider: "google.com",
        },
      });

      // Allow user creation - they'll be redirected to complete profile
      return;
    } catch (error) {
      console.error("Error creating user profile:", error);
      // Still allow creation - we can handle missing profile data gracefully
      return;
    }
  }
);
