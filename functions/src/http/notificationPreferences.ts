/**
 * Notification Preferences Management HTTP Functions
 */

import * as logger from "firebase-functions/logger";
import {onRequest} from "firebase-functions/v2/https";
import {db} from "../config/firebase";
import {NotificationPreferences} from "../types";

/**
 * List all notification preferences (Admin only) or get user's own preferences
 * GET /listNotificationPreferences?userId=<optional>
 */
export const listNotificationPreferences = onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    try {
      // Only allow GET requests
      if (req.method !== "GET") {
        res.status(405).json({
          success: false,
          error: "Method not allowed",
        });
        return;
      }

      const userId = req.query.userId as string | undefined;

      let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
        db.collection("notificationPreferences");

      // If userId is provided, filter by that user
      if (userId) {
        query = query.where("userId", "==", userId);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        res.status(200).json({
          success: true,
          data: [],
        });
        return;
      }

      const preferences: NotificationPreferences[] = [];
      snapshot.forEach((doc) => {
        preferences.push({
          ...doc.data() as NotificationPreferences,
        });
      });

      logger.info("Retrieved notification preferences", {
        count: preferences.length,
        userId: userId || "all",
      });

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error("Error listing notification preferences:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve notification preferences",
      });
    }
  }
);

/**
 * Setup or update notification preferences for a user
 * POST /setupNotificationPreferences
 * Body: NotificationPreferences
 */
export const setupNotificationPreferences = onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    try {
      // Only allow POST requests
      if (req.method !== "POST") {
        res.status(405).json({
          success: false,
          error: "Method not allowed",
        });
        return;
      }

      const preferences = req.body as NotificationPreferences;

      // Validate required fields
      if (!preferences.userId || !preferences.email) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: userId and email",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(preferences.email)) {
        res.status(400).json({
          success: false,
          error: "Invalid email format",
        });
        return;
      }

      // Validate quiet hours if enabled
      if (preferences.quietHoursEnabled) {
        if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
          res.status(400).json({
            success: false,
            error: "Quiet hours start and end times are required when enabled",
          });
          return;
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (
          !timeRegex.test(preferences.quietHoursStart) ||
          !timeRegex.test(preferences.quietHoursEnd)
        ) {
          res.status(400).json({
            success: false,
            error: "Invalid time format. Use HH:mm format",
          });
          return;
        }
      }

      // Prepare data for Firestore
      const prefData = {
        userId: preferences.userId,
        email: preferences.email,
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? false,
        alertSeverities: preferences.alertSeverities || [],
        parameters: preferences.parameters || [],
        devices: preferences.devices || [],
        quietHoursEnabled: preferences.quietHoursEnabled ?? false,
        quietHoursStart: preferences.quietHoursStart || null,
        quietHoursEnd: preferences.quietHoursEnd || null,
        updatedAt: new Date().toISOString(),
      };

      // Use userId as document ID
      await db
        .collection("notificationPreferences")
        .doc(preferences.userId)
        .set(prefData, {merge: true});

      logger.info("Updated notification preferences", {
        userId: preferences.userId,
      });

      res.status(200).json({
        success: true,
        message: "Notification preferences saved successfully",
        data: prefData,
      });
    } catch (error) {
      logger.error("Error setting up notification preferences:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save notification preferences",
      });
    }
  }
);

/**
 * Delete notification preferences for a user
 * DELETE /deleteNotificationPreferences?userId=<userId>
 */
export const deleteNotificationPreferences = onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    try {
      // Only allow DELETE requests
      if (req.method !== "DELETE") {
        res.status(405).json({
          success: false,
          error: "Method not allowed",
        });
        return;
      }

      const userId = req.query.userId as string;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "Missing required parameter: userId",
        });
        return;
      }

      await db
        .collection("notificationPreferences")
        .doc(userId)
        .delete();

      logger.info("Deleted notification preferences", {userId});

      res.status(200).json({
        success: true,
        message: "Notification preferences deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting notification preferences:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete notification preferences",
      });
    }
  }
);
