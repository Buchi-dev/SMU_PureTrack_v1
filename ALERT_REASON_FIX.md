# Alert Reason/Message Fix

## Issue Identified

**Problem**: Alerts in Firestore were missing the `message` and `recommendedAction` fields (the "alert reason").

**Example Alert Data (BEFORE FIX)**:
```javascript
{
  alertId: "o21dfhDb5DFK4vFbmL00",
  alertType: "trend",
  changeRate: 16.586151368760067,
  deviceId: "esp32_sim_0003",
  parameter: "turbidity",
  previousValue: 12.42,
  severity: "Advisory",
  status: "Active",
  thresholdValue: null,
  trendDirection: "increasing",
  value: 14.48,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // ❌ MISSING: message
  // ❌ MISSING: recommendedAction
  // ❌ MISSING: deviceName
  // ❌ MISSING: deviceBuilding
  // ❌ MISSING: deviceFloor
}
```

## Root Cause Analysis

The issue was in `functions/src_new/pubsub/processSensorData.ts`:

### Problem Location
The `createAlertWithDuplicationCheck()` function was creating alerts **without** generating the descriptive content:

```typescript
// ❌ BEFORE: Alert created WITHOUT message generation
transaction.set(newAlertRef, {
  ...alertData,
  alertId: newAlertRef.id,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

The function bypassed the `generateAlertContent()` helper from `alertHelpers.ts`, which is responsible for:
1. Fetching device information (name, building, floor)
2. Generating human-readable alert messages
3. Creating severity-appropriate recommended actions

## Solution Implemented

### Changes Made to `processSensorData.ts`

**1. Added Import**:
```typescript
import {getNotificationRecipients, generateAlertContent} from "../utils/alertHelpers";
```

**2. Enhanced `createAlertWithDuplicationCheck()` Function**:

```typescript
async function createAlertWithDuplicationCheck(
  deviceId: string,
  parameter: WaterParameter,
  alertType: string,
  severity: string,
  alertData: Record<string, unknown>
): Promise<string | null> {
  try {
    // ✅ NEW: Fetch device information for alert content generation
    let deviceName = "Unknown Device";
    const deviceLocation: {building?: string; floor?: string} = {};

    try {
      const deviceDoc = await db.collection(COLLECTIONS.DEVICES).doc(deviceId).get();

      if (deviceDoc.exists) {
        const deviceData = deviceDoc.data();
        deviceName = deviceData?.name || deviceId;

        // Extract location information if available
        if (deviceData?.metadata?.location) {
          const location = deviceData.metadata.location;
          if (location.building) deviceLocation.building = location.building;
          if (location.floor) deviceLocation.floor = location.floor;
        }
      }
    } catch (error) {
      logger.warn("Failed to fetch device information for alert:", error);
    }

    // ✅ NEW: Generate alert message and recommended action
    const {message, recommendedAction} = generateAlertContent(
      parameter,
      (alertData.value as number) || 0,
      severity as "Advisory" | "Warning" | "Critical",
      alertType as "threshold" | "trend",
      alertData.trendDirection as TrendDirection | undefined,
      deviceLocation
    );

    // Use transaction to atomically check and create
    const result = await db.runTransaction(async (transaction) => {
      // ... duplicate check logic ...

      // ✅ NEW: Create alert WITH generated content
      const newAlertRef = db.collection(COLLECTIONS.ALERTS).doc();
      transaction.set(newAlertRef, {
        ...alertData,
        deviceName,
        ...(deviceLocation.building && {deviceBuilding: deviceLocation.building}),
        ...(deviceLocation.floor && {deviceFloor: deviceLocation.floor}),
        message,
        recommendedAction,
        alertId: newAlertRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        notificationsSent: [],
      });

      return newAlertRef.id;
    });

    return result;
  } catch (error) {
    // ... error handling ...
  }
}
```

## What This Fix Provides

### Now Alerts Include:

1. **Device Information**:
   - `deviceName`: Human-readable device name (e.g., "ESP32 Sim 0003")
   - `deviceBuilding`: Building location (if configured)
   - `deviceFloor`: Floor location (if configured)

2. **Alert Messages** (examples):
   ```
   // Threshold Alert with Location:
   "[Main Lab, Floor 2] Turbidity has reached critical level: 14.48 NTU"
   
   // Trend Alert without Location:
   "Turbidity is increasing abnormally: 14.48 NTU"
   
   // With Building Only:
   "[Research Wing] pH has reached warning level: 9.20"
   ```

3. **Recommended Actions** (severity-based):
   ```
   // Critical:
   "Immediate action required at Main Lab, Floor 2. Investigate water source and 
   treatment system. Consider temporary shutdown if necessary."
   
   // Warning:
   "Monitor closely at Research Wing and prepare corrective actions. Schedule system 
   inspection within 24 hours."
   
   // Advisory:
   "Continue monitoring at Building A, Floor 1. Note for regular maintenance schedule."
   
   // Trend Alerts:
   "Investigate cause of increasing trend at Main Lab, Floor 2. Check system 
   calibration and recent changes to water source or treatment."
   ```

## Expected Alert Structure (AFTER FIX)

```javascript
{
  alertId: "o21dfhDb5DFK4vFbmL00",
  alertType: "trend",
  changeRate: 16.586151368760067,
  deviceId: "esp32_sim_0003",
  deviceName: "ESP32 Sim 0003",              // ✅ NOW INCLUDED
  deviceBuilding: "Main Lab",                 // ✅ NOW INCLUDED (if configured)
  deviceFloor: "Floor 2",                     // ✅ NOW INCLUDED (if configured)
  parameter: "turbidity",
  previousValue: 12.42,
  severity: "Advisory",
  status: "Active",
  thresholdValue: null,
  trendDirection: "increasing",
  value: 14.48,
  message: "Turbidity is increasing abnormally: 14.48 NTU",  // ✅ NOW INCLUDED
  recommendedAction: "Investigate cause of increasing trend. Check system calibration and recent changes to water source or treatment.",  // ✅ NOW INCLUDED
  createdAt: Timestamp,
  updatedAt: Timestamp,
  notificationsSent: []                       // ✅ NOW INCLUDED
}
```

## Deployment Status

- ✅ **Code Changes**: Completed
- ✅ **TypeScript Build**: Successful
- ✅ **ESLint Validation**: Passed
- ✅ **Firebase Functions Deploy**: Successful (all 11 functions updated)
- ✅ **Production Status**: Live

## Testing Recommendations

1. **Trigger New Alerts**: 
   - Wait for sensor data that exceeds thresholds
   - Or manually trigger trend analysis
   
2. **Verify Alert Fields**:
   - Check Firestore console for new alerts
   - Confirm `message` and `recommendedAction` fields are populated
   - Verify device location fields appear when configured

3. **UI Verification**:
   - Check alert cards in Admin Dashboard
   - Verify "Alert Reason" is now displayed
   - Confirm email notifications include the message

## Notes

- **Existing Alerts**: Old alerts without messages will remain unchanged. Only new alerts will have the complete data structure.
- **Backward Compatibility**: The schema allows optional `message` field, so the UI should handle both old and new alerts gracefully.
- **Performance**: Fetching device info adds one additional Firestore read per alert, but this is acceptable since alerts are relatively infrequent.

## Related Files

- **Fixed File**: `functions/src_new/pubsub/processSensorData.ts`
- **Alert Helper**: `functions/src_new/utils/alertHelpers.ts` (already had the logic)
- **Alert Schema**: `client/src/schemas/alerts.schema.ts` (already supported optional message field)

---

**Fix Completed**: November 19, 2025
**Deployed By**: GitHub Copilot
**Status**: ✅ Production Ready
