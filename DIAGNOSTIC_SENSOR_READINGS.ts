/**
 * Diagnostic Script: Check Sensor Readings Data
 * Run this in Firebase Console or locally to debug why queries return 0 readings
 */

// ============================================================================
// DIAGNOSTIC STEPS
// ============================================================================

/**
 * STEP 1: Check if sensor_readings collection exists
 * 
 * Go to: Firebase Console > Firestore Database
 * 
 * Look for collections named:
 * - sensor_readings ✓ (expected)
 * - sensorReadings
 * - sensor-readings  
 * - readings
 * 
 * If different name found, update COLLECTIONS.SENSOR_READINGS in:
 * functions/src/constants/database.constants.ts
 */

/**
 * STEP 2: Check document structure
 * 
 * Open any document in sensor_readings collection
 * 
 * Expected fields:
 * {
 *   deviceId: "esp32_dev_001",           // ← Must match exactly!
 *   timestamp: 1730745107000,            // ← Number in milliseconds
 *   ph: 7.2,                             // ← Number
 *   tds: 450,                            // ← Number  
 *   turbidity: 2.1,                      // ← Number
 *   receivedAt: 1730745107000            // ← Number
 * }
 * 
 * Common Issues:
 * - deviceId uses different field name (device_id, deviceID, id)
 * - timestamp is in seconds (1730745107) not milliseconds
 * - timestamp is a Firestore Timestamp object, not number
 * - Values are strings ("7.2") not numbers (7.2)
 */

/**
 * STEP 3: Check deviceId values
 * 
 * In report, you selected:
 * - Water Quality Monitor 1 (arduino_uno_r4_001)
 * - Water Quality Monitor ESP32 (esp32_dev_001)
 * 
 * In sensor_readings documents, check if deviceId field contains:
 * - "arduino_uno_r4_001" ← Must match exactly!
 * - "esp32_dev_001" ← Must match exactly!
 * 
 * If different, the query won't find any documents.
 */

/**
 * STEP 4: Check timestamp values
 * 
 * Your report date range:
 * - Start: Oct 26, 2025 = 1729900800000 (milliseconds)
 * - End: Dec 6, 2025 = 1733443200000 (milliseconds)
 * 
 * Check if sensor_readings have timestamps in this range.
 * 
 * Common Issues:
 * - Timestamps are in seconds (divide by 1000)
 * - Timestamps are from past/future (check actual dates)
 * - No data exists in selected date range
 * 
 * Test Query in Firestore Console:
 * Collection: sensor_readings
 * Where: timestamp >= 1729900800000
 * Where: timestamp <= 1733443200000
 * 
 * If this returns 0, your data is outside the date range!
 */

/**
 * STEP 5: Test without date range
 * 
 * Generate report WITHOUT selecting date range.
 * This will fetch most recent 100 readings.
 * 
 * If this works:
 * → Date range issue (data exists but outside selected dates)
 * 
 * If this also shows zeros:
 * → deviceId mismatch or collection name issue
 */

// ============================================================================
// FIRESTORE CONSOLE QUERY TESTS
// ============================================================================

/**
 * Test Query 1: Check if ANY sensor readings exist
 * 
 * Collection: sensor_readings
 * Order by: timestamp desc
 * Limit: 10
 * 
 * Expected: Should return some documents
 * If empty: Collection is empty or has different name
 */

/**
 * Test Query 2: Check for specific device
 * 
 * Collection: sensor_readings  
 * Where: deviceId == "esp32_dev_001"
 * Order by: timestamp desc
 * Limit: 10
 * 
 * Expected: Should return readings for that device
 * If empty: deviceId field name or value is different
 */

/**
 * Test Query 3: Check date range
 * 
 * Collection: sensor_readings
 * Where: deviceId == "esp32_dev_001"
 * Where: timestamp >= 1729900800000  
 * Where: timestamp <= 1733443200000
 * Order by: timestamp desc
 * 
 * Expected: Should return readings in that date range
 * If empty: No data in that period or timestamp format issue
 * 
 * NOTE: This requires composite index:
 * {
 *   collection: "sensor_readings",
 *   fields: [
 *     { fieldPath: "deviceId", order: "ASCENDING" },
 *     { fieldPath: "timestamp", order: "DESCENDING" }
 *   ]
 * }
 */

// ============================================================================
// SOLUTIONS BASED ON FINDINGS
// ============================================================================

/**
 * SOLUTION 1: Collection name is different
 * 
 * File: functions/src/constants/database.constants.ts
 * 
 * Change:
 * export const COLLECTIONS = {
 *   SENSOR_READINGS: "sensor_readings",  // Update this
 *   ...
 * };
 */

/**
 * SOLUTION 2: Field name is different
 * 
 * File: functions/src/callable/generateReport.ts
 * 
 * If deviceId field is named differently (e.g., "device_id"):
 * Change:
 * .where("deviceId", "==", deviceId)
 * To:
 * .where("device_id", "==", deviceId)  // Use actual field name
 */

/**
 * SOLUTION 3: Timestamp is in seconds
 * 
 * File: functions/src/callable/generateReport.ts
 * 
 * Convert milliseconds to seconds for query:
 * if (startDate) {
 *   readingsQuery = readingsQuery.where(
 *     "timestamp", 
 *     ">=", 
 *     Math.floor(startDate / 1000)  // Convert to seconds
 *   );
 * }
 */

/**
 * SOLUTION 4: Create composite index
 * 
 * File: firestore.indexes.json (already exists)
 * 
 * The index is already there! But deploy it:
 * firebase deploy --only firestore:indexes
 * 
 * Wait 5-10 minutes for index to build.
 */

/**
 * SOLUTION 5: No data in date range
 * 
 * User Action:
 * - Generate report WITHOUT date range
 * - Or select different date range that includes data
 * - Check when your devices last sent data
 */

// ============================================================================
// QUICK FIREBASE CONSOLE CHECK
// ============================================================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  SENSOR READINGS DIAGNOSTIC CHECKLIST                          ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  1. [ ] Check collection name: sensor_readings exists          ║
║  2. [ ] Open any document and verify fields:                   ║
║         - deviceId (string)                                    ║
║         - timestamp (number in milliseconds)                   ║
║         - ph, tds, turbidity (numbers)                         ║
║  3. [ ] Verify deviceId matches exactly:                       ║
║         - "arduino_uno_r4_001"                                 ║
║         - "esp32_dev_001"                                      ║
║  4. [ ] Check if timestamp values are in your date range       ║
║  5. [ ] Run test query in Firestore Console                    ║
║  6. [ ] Generate report without date range                     ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝

Next Steps:
1. Open Firebase Console: https://console.firebase.google.com
2. Go to your project: my-app-da530
3. Navigate to: Firestore Database
4. Check: sensor_readings collection
5. Verify: Document structure matches expected format
6. Test: Queries in Firestore Console

After checking, generate report and check Firebase Functions logs:
- Look for: "📊 Generating Water Quality Report"
- Check: "Found X readings for device Y"
- If "Found 0 readings": Apply solution based on findings above
`);

export {};
