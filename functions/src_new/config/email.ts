/**
 * Email Configuration
 * Nodemailer setup for sending alert notifications
 *
 * @module config/email
 *
 * SECURITY NOTE:
 * Email credentials MUST be stored in Firebase Secret Manager.
 * Use Firebase CLI to set secrets:
 *   firebase functions:secrets:set EMAIL_USER
 *   firebase functions:secrets:set EMAIL_PASSWORD
 *
 * Then update function declarations to include secrets:
 *   export const myFunction = onSchedule(
 *     { schedule: '...', secrets: [EMAIL_USER, EMAIL_PASSWORD] },
 *     async (event) => { ... }
 *   );
 */

import {defineSecret} from "firebase-functions/params";

/**
 * Email credentials from Firebase Secret Manager
 * These secrets must be configured before deploying functions that send emails
 */
const EMAIL_USER_SECRET = defineSecret("EMAIL_USER");
const EMAIL_PASSWORD_SECRET = defineSecret("EMAIL_PASSWORD");

/**
 * Get email configuration from secrets
 * Call this function inside your Cloud Function handlers
 * @return {object} Email credentials object with user and password
 */
export function getEmailCredentials(): { user: string; password: string } {
  const user = EMAIL_USER_SECRET.value();
  const password = EMAIL_PASSWORD_SECRET.value();

  if (!user || !password) {
    throw new Error(
      "Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD secrets using Firebase CLI."
    );
  }

  return {user, password};
}

export const EMAIL_USER_SECRET_REF = EMAIL_USER_SECRET;
export const EMAIL_PASSWORD_SECRET_REF = EMAIL_PASSWORD_SECRET;

/**
 * Email template for analytics reports
 */
export interface AnalyticsEmailData {
  recipientEmail: string;
  recipientName: string;
  reportType: "daily" | "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  deviceSummary: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    healthScore: number;
  };
  alertCounts: {
    Critical: number;
    Warning: number;
    Advisory: number;
    total: number;
  };
  topDevices: Array<{
    deviceId: string;
    name: string;
    status: string;
    uptime: number;
    latestReading?: {
      ph?: number;
      tds?: number;
      turbidity?: number;
    };
  }>;
  recentAlerts: Array<{
    id: string;
    severity: string;
    deviceName?: string;
    parameter: string;
    value: number;
    createdAt: Date;
  }>;
}
