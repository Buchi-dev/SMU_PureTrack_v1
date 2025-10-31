/**
 * Test Utilities for Alert Digest System
 * 
 * Run these tests in Firebase Functions Shell or as standalone scripts
 * to verify the 24-hour cooldown implementation.
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Test 1: Create a mock alert to trigger digest aggregation
 * Expected: New digest document created in alerts_digests collection
 */
export async function testCreateMockAlert(): Promise<void> {
  console.log("=== TEST 1: Creating Mock Alert ===");

  const mockAlert = {
    deviceId: "test-esp32-001",
    deviceName: "Test Device - Building A",
    deviceBuilding: "Building A",
    deviceFloor: "Floor 2",
    parameter: "ph",
    alertType: "threshold",
    severity: "Critical",
    status: "Active",
    currentValue: 9.5,
    thresholdValue: 8.5,
    message: "pH Level Critical: 9.5 at Building A, Floor 2",
    recommendedAction: "Immediate action required. Check water source.",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    notificationsSent: [],
  };

  try {
    const alertRef = await db.collection("alerts").add(mockAlert);
    await alertRef.update({alertId: alertRef.id});

    console.log(`✅ Mock alert created: ${alertRef.id}`);
    console.log("⏳ Wait 10-30 seconds for aggregateAlertsToDigest trigger...");
    console.log("📊 Check alerts_digests collection for new document");

    return alertRef.id;
  } catch (error) {
    console.error("❌ Failed to create mock alert:", error);
    throw error;
  }
}

/**
 * Test 2: Query eligible digests (should match scheduler query)
 * Expected: Returns digests ready to send
 */
export async function testQueryEligibleDigests(): Promise<void> {
  console.log("\n=== TEST 2: Query Eligible Digests ===");

  try {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection("alerts_digests")
      .where("isAcknowledged", "==", false)
      .where("cooldownUntil", "<=", now)
      .where("sendAttempts", "<", 3)
      .limit(10)
      .get();

    console.log(`✅ Found ${snapshot.size} eligible digest(s)`);

    if (snapshot.empty) {
      console.log("ℹ️ No digests ready to send");
      console.log("💡 Create a digest by running testCreateMockAlert()");
      console.log("💡 Or manually set cooldownUntil to past date in Firestore");
    } else {
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`\n📧 Digest: ${doc.id}`);
        console.log(`   Recipient: ${data.recipientEmail}`);
        console.log(`   Category: ${data.category}`);
        console.log(`   Items: ${data.items?.length || 0}`);
        console.log(`   Attempts: ${data.sendAttempts}/3`);
        console.log(`   Cooldown Until: ${data.cooldownUntil?.toDate()}`);
      });
    }

    return snapshot.docs;
  } catch (error) {
    console.error("❌ Query failed:", error);
    console.log("⚠️ Check if Firestore composite index is created:");
    console.log("   https://console.firebase.google.com/project/_/firestore/indexes");
    throw error;
  }
}

/**
 * Test 3: Manually trigger digest send for testing
 * Expected: Email sent, digest updated with cooldown
 */
export async function testSendSingleDigest(digestId: string): Promise<void> {
  console.log("\n=== TEST 3: Send Single Digest ===");
  console.log(`📧 Testing digest: ${digestId}`);

  try {
    const digestRef = db.collection("alerts_digests").doc(digestId);
    const digestDoc = await digestRef.get();

    if (!digestDoc.exists) {
      console.error("❌ Digest not found");
      return;
    }

    const digest = digestDoc.data();
    console.log(`✅ Digest loaded: ${digest?.recipientEmail}`);
    console.log(`   Items: ${digest?.items?.length}`);
    console.log(`   Current attempts: ${digest?.sendAttempts}/3`);

    // NOTE: Actual email sending requires sendAlertDigests function
    // This test only verifies digest structure
    console.log("\n💡 To send this digest:");
    console.log("   1. Run: firebase functions:shell");
    console.log("   2. Execute: sendAlertDigests()");
    console.log("\n   OR manually trigger scheduler in Firebase Console");

    // Validate digest structure
    const requiredFields = [
      "recipientUid",
      "recipientEmail",
      "category",
      "items",
      "cooldownUntil",
      "sendAttempts",
      "isAcknowledged",
      "ackToken",
    ];

    const missingFields = requiredFields.filter((field) => !(field in digest));
    if (missingFields.length > 0) {
      console.warn(`⚠️ Missing fields: ${missingFields.join(", ")}`);
    } else {
      console.log("✅ Digest structure valid");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

/**
 * Test 4: Test acknowledgement logic (without HTTP)
 * Expected: Digest marked as acknowledged
 */
export async function testAcknowledgeDigest(
  digestId: string,
  token: string
): Promise<void> {
  console.log("\n=== TEST 4: Test Acknowledgement ===");
  console.log(`📝 Digest: ${digestId}`);
  console.log(`🔑 Token: ${token.substring(0, 16)}...`);

  try {
    const digestRef = db.collection("alerts_digests").doc(digestId);
    const digestDoc = await digestRef.get();

    if (!digestDoc.exists) {
      console.error("❌ Digest not found");
      return;
    }

    const digest = digestDoc.data();

    // Verify token
    if (digest?.ackToken !== token) {
      console.error("❌ Invalid token");
      return;
    }

    if (digest?.isAcknowledged) {
      console.log("ℹ️ Digest already acknowledged");
      return;
    }

    // Acknowledge
    await digestRef.update({
      isAcknowledged: true,
      acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
      acknowledgedBy: digest.recipientUid,
      cooldownUntil: null,
    });

    console.log("✅ Digest acknowledged successfully");
    console.log("💡 This digest will no longer be sent by scheduler");
  } catch (error) {
    console.error("❌ Acknowledgement failed:", error);
    throw error;
  }
}

/**
 * Test 5: Verify notification preferences for digest recipients
 * Expected: Returns users with emailNotifications enabled
 */
export async function testQueryRecipients(): Promise<void> {
  console.log("\n=== TEST 5: Query Recipients ===");

  try {
    const snapshot = await db
      .collection("notificationPreferences")
      .where("emailNotifications", "==", true)
      .get();

    console.log(`✅ Found ${snapshot.size} recipient(s) with email notifications enabled`);

    if (snapshot.empty) {
      console.warn("⚠️ No recipients configured!");
      console.log("💡 Add test recipient:");
      console.log(`
      db.collection('notificationPreferences').doc('test-user-001').set({
        userId: 'test-user-001',
        email: 'your-email@example.com',
        emailNotifications: true,
        pushNotifications: false,
        alertSeverities: ['Critical', 'Warning', 'Advisory'],
        parameters: ['ph', 'tds', 'turbidity'],
        devices: [],
        quietHoursEnabled: false
      });
      `);
    } else {
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`\n👤 User: ${data.userId}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   Severities: ${data.alertSeverities?.join(", ")}`);
        console.log(`   Parameters: ${data.parameters?.join(", ")}`);
      });
    }
  } catch (error) {
    console.error("❌ Query failed:", error);
    throw error;
  }
}

/**
 * Test 6: Cleanup test data
 * Expected: Removes test alerts and digests
 */
export async function cleanupTestData(): Promise<void> {
  console.log("\n=== TEST 6: Cleanup Test Data ===");

  try {
    // Delete test alerts
    const alertsSnapshot = await db
      .collection("alerts")
      .where("deviceId", "==", "test-esp32-001")
      .get();

    const batch1 = db.batch();
    alertsSnapshot.forEach((doc) => batch1.delete(doc.ref));
    await batch1.commit();

    console.log(`✅ Deleted ${alertsSnapshot.size} test alert(s)`);

    // Delete test digests (documents starting with test user IDs)
    const digestsSnapshot = await db.collection("alerts_digests").limit(100).get();

    let deletedCount = 0;
    const batch2 = db.batch();

    digestsSnapshot.forEach((doc) => {
      // Only delete digests for test users (adjust pattern as needed)
      if (doc.id.startsWith("test-user")) {
        batch2.delete(doc.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await batch2.commit();
      console.log(`✅ Deleted ${deletedCount} test digest(s)`);
    } else {
      console.log("ℹ️ No test digests found");
    }
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    throw error;
  }
}

/**
 * Run all tests in sequence
 */
export async function runAllTests(): Promise<void> {
  console.log("🧪 Starting Alert Digest System Tests\n");
  console.log("=" .repeat(60));

  try {
    // Check recipients first
    await testQueryRecipients();

    // Create mock alert
    const alertId = await testCreateMockAlert();

    // Wait for trigger to process
    console.log("\n⏳ Waiting 30 seconds for trigger to process...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Query eligible digests
    const digests = await testQueryEligibleDigests();

    // Test send if digest exists
    if (digests && digests.length > 0) {
      await testSendSingleDigest(digests[0].id);
    }

    console.log("\n✅ All tests completed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Check Firestore Console for alerts_digests collection");
    console.log("   2. Manually trigger sendAlertDigests() in Functions Shell");
    console.log("   3. Check email for digest notification");
    console.log("   4. Test acknowledgement via HTTP endpoint");
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
  }
}

/**
 * Quick test helper - Add test notification preferences
 */
export async function addTestRecipient(
  email: string,
  userId = "test-user-001"
): Promise<void> {
  console.log("\n=== Adding Test Recipient ===");

  try {
    await db
      .collection("notificationPreferences")
      .doc(userId)
      .set({
        userId,
        email,
        emailNotifications: true,
        pushNotifications: false,
        alertSeverities: ["Critical", "Warning", "Advisory"],
        parameters: ["ph", "tds", "turbidity"],
        devices: [], // Empty = all devices
        quietHoursEnabled: false,
      });

    console.log(`✅ Added test recipient: ${email}`);
  } catch (error) {
    console.error("❌ Failed to add recipient:", error);
    throw error;
  }
}

// Export for Firebase Functions Shell usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    testCreateMockAlert,
    testQueryEligibleDigests,
    testSendSingleDigest,
    testAcknowledgeDigest,
    testQueryRecipients,
    cleanupTestData,
    runAllTests,
    addTestRecipient,
  };
}
