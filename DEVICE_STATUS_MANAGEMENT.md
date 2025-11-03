# Device Status Management System
**Real-time Online/Offline Detection**

**Date:** 2025-11-03  
**Status:** ✅ **IMPLEMENTED - AUTOMATIC OFFLINE DETECTION**

---

## Executive Summary

This document explains how the system automatically detects and updates device online/offline status in real-time, addressing the issue where devices were always showing as "online" even when disconnected.

**Solution Implemented:**
- ✅ Scheduled function checks device status every 5 minutes
- ✅ Devices marked offline if no heartbeat for 10 minutes
- ✅ Automatic recovery when device comes back online
- ✅ Grace period to account for network delays

---

## Problem Statement

### Original Issue
**Symptom:** Devices in the Device Management page always show as "Online", even when physically turned off or disconnected from the network.

**User Impact:** 
- Unable to identify which devices are actually reachable
- Difficult to troubleshoot connectivity issues
- Misleading information for system administrators

**Root Cause:** 
The system only updated device status to "online" when receiving sensor data, but had no mechanism to detect when devices stop sending data and mark them as "offline".

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEVICE STATUS FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

SCENARIO 1: Device Online (Normal Operation)
─────────────────────────────────────────────

Arduino Device
  ↓ Every 30 seconds: Reads sensors
  ↓ Every 5 minutes: Publishes batch + heartbeat
  ↓ MQTT: device/status/{id} → { status: "online", uptime, rssi }
MQTT Bridge
  ↓ Forwards to Pub/Sub: iot-device-status
Firebase Function: monitorDeviceStatus
  ↓ Updates Firestore: devices/{id}
  ↓ Sets: status = "online", lastSeen = NOW
Firestore
  ✅ Device shows as "online" in UI


SCENARIO 2: Device Goes Offline
────────────────────────────────

Arduino Device
  ✗ Disconnected / Powered off
  ✗ No MQTT messages sent
  ✗ No status heartbeats
Firestore
  ⚠️ status = "online" (stale)
  ⚠️ lastSeen = 5 minutes ago (getting old)
Scheduled Function: checkOfflineDevices (runs every 5 minutes)
  ↓ Checks all devices
  ↓ Finds: lastSeen > 10 minutes old
  ↓ Updates Firestore: devices/{id}
  ↓ Sets: status = "offline", offlineSince = NOW
Firestore
  ✅ Device shows as "offline" in UI


SCENARIO 3: Device Comes Back Online
─────────────────────────────────────

Arduino Device
  ↓ Reconnects to WiFi/MQTT
  ↓ Publishes sensor data
  ↓ MQTT: device/sensordata/{id} → { readings: [...] }
Firebase Function: processSensorData
  ↓ Processes sensor data
  ↓ Updates Firestore: devices/{id}
  ↓ Sets: status = "online", lastSeen = NOW
  ↓ Clears: offlineSince field (deleted)
Firestore
  ✅ Device shows as "online" again in UI
```

---

## Implementation Details

### 1. Scheduled Function: checkOfflineDevices

**File:** `functions/src/scheduler/checkOfflineDevices.ts`

**Schedule:** Every 5 minutes (`*/5 * * * *`)

**Logic:**
```typescript
const OFFLINE_THRESHOLD_MS = 600000; // 10 minutes

export const checkOfflineDevices = onSchedule(
  { schedule: "*/5 * * * *" },
  async (event) => {
    const now = Date.now();
    const offlineThreshold = now - OFFLINE_THRESHOLD_MS;
    
    // Query all devices
    const devicesSnapshot = await db.collection('devices').get();
    
    devicesSnapshot.forEach((doc) => {
      const deviceData = doc.data();
      
      // Skip if already offline or in maintenance
      if (deviceData.status === 'offline' || deviceData.status === 'maintenance') {
        return;
      }
      
      // Check lastSeen timestamp
      if (deviceData.lastSeen) {
        const lastSeenTimestamp = deviceData.lastSeen.toMillis();
        
        // Mark as offline if lastSeen > 10 minutes old
        if (lastSeenTimestamp < offlineThreshold) {
          batch.update(doc.ref, {
            status: 'offline',
            offlineSince: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });
    
    await batch.commit();
  }
);
```

**Key Features:**
- ✅ Runs every 5 minutes (aligned with device heartbeat interval)
- ✅ 10-minute threshold allows for one missed heartbeat + network delays
- ✅ Batch updates for efficiency (processes all devices at once)
- ✅ Only updates devices that are currently "online"
- ✅ Adds `offlineSince` timestamp for tracking
- ✅ Logs detailed information for debugging

---

### 2. Update processSensorData to Clear offlineSince

**File:** `functions/src/pubsub/processSensorData.ts`

**Enhancement:**
```typescript
async function updateDeviceStatus(deviceId: string): Promise<void> {
  // ... existing code ...
  
  if (shouldUpdateFirestore) {
    const updateData: Record<string, unknown> = {
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      status: "online",
    };
    
    // Clear offlineSince if device was previously offline
    if (deviceData?.offlineSince) {
      updateData.offlineSince = admin.firestore.FieldValue.delete();
    }
    
    await db.collection(COLLECTIONS.DEVICES).doc(deviceId).update(updateData);
  }
}
```

**Purpose:**
- When device sends sensor data, it's clearly online
- Update status to "online"
- Clear the `offlineSince` field (device is no longer offline)
- This ensures clean state transitions

---

### 3. Existing Status Update Mechanisms (Unchanged)

**A. monitorDeviceStatus (Pub/Sub Trigger)**
- **File:** `functions/src/pubsub/monitorDeviceStatus.ts`
- **Trigger:** When device publishes to `device/status/{id}`
- **Action:** Updates device status and lastSeen immediately
- **Frequency:** Every 5 minutes (device heartbeat)

**B. processSensorData Status Update**
- **File:** `functions/src/pubsub/processSensorData.ts`
- **Trigger:** When device publishes sensor data
- **Action:** Updates lastSeen and sets status to "online"
- **Frequency:** Every 5 minutes (batch publish)
- **Optimization:** Only updates Firestore if lastSeen > 5 minutes old

---

## Timing & Thresholds

### Device Behavior
| Interval | Action | Topic |
|----------|--------|-------|
| Every 30 seconds | Read sensors → Buffer | N/A |
| Every 5 minutes | Publish batch | `device/sensordata/{id}` |
| Every 5 minutes | Publish heartbeat | `device/status/{id}` |

### System Behavior
| Interval | Action | Function |
|----------|--------|----------|
| Immediate | Update on sensor data | `processSensorData` |
| Immediate | Update on heartbeat | `monitorDeviceStatus` |
| Every 5 minutes | Check for offline devices | `checkOfflineDevices` |

### Thresholds
| Threshold | Value | Purpose |
|-----------|-------|---------|
| **lastSeen update** | 5 minutes | Throttle Firestore writes |
| **Offline detection** | 10 minutes | Mark device as offline |

---

## Status Transition States

```
┌──────────┐  Sensor Data   ┌──────────┐
│          │  Received      │          │
│ OFFLINE  │──────────────→ │  ONLINE  │
│          │                │          │
└──────────┘                └──────────┘
     ↑                           │
     │                           │
     │    lastSeen > 10 min      │
     └───────────────────────────┘
         (checkOfflineDevices)
```

### State Descriptions

**ONLINE:**
- Device is actively sending data
- lastSeen < 10 minutes ago
- Displayed with green badge in UI
- Icon: CheckCircleOutlined

**OFFLINE:**
- Device hasn't sent data for > 10 minutes
- offlineSince timestamp recorded
- Displayed with gray badge in UI
- Icon: CloseCircleOutlined

**MAINTENANCE (Manual):**
- Administrator-set status
- Not automatically changed by system
- Used for planned downtime
- Icon: ToolOutlined

**ERROR (Future Enhancement):**
- Device reporting errors
- Could be set by device itself or system
- Indicates malfunction
- Icon: WarningOutlined

---

## Grace Period & Reliability

### Why 10-minute Threshold?

**Device Behavior:**
- Publishes every 5 minutes (sensor data + heartbeat)
- If one publish fails, next one is 5 minutes later

**Threshold Calculation:**
```
Normal interval:        5 minutes
Allow 1 missed publish: +5 minutes
Network delays:         +0 minutes (built into threshold)
──────────────────────────────────
Total threshold:        10 minutes
```

**Benefits:**
- ✅ Prevents false positives from temporary network issues
- ✅ Allows for one complete missed publish cycle
- ✅ Balances quick detection with reliability
- ✅ Aligned with device publish intervals

### Edge Cases Handled

**Case 1: Network Hiccup**
- Device temporarily loses connection for 2 minutes
- Reconnects and publishes
- Status remains "online" (lastSeen updated)
- ✅ No false offline detection

**Case 2: Device Powers Off**
- Device stops sending data
- After 10 minutes, marked as "offline"
- When powered back on, immediately marked "online"
- ✅ Accurate status tracking

**Case 3: Maintenance Mode**
- Administrator sets status to "maintenance"
- checkOfflineDevices skips devices in maintenance
- Status remains "maintenance" until manually changed
- ✅ Respects manual overrides

---

## Firestore Schema Changes

### Device Document Structure

**Before (Fields Used):**
```typescript
{
  deviceId: string,
  name: string,
  status: "online" | "offline" | "error" | "maintenance",
  lastSeen: Timestamp,
  // ... other fields
}
```

**After (New Field Added):**
```typescript
{
  deviceId: string,
  name: string,
  status: "online" | "offline" | "error" | "maintenance",
  lastSeen: Timestamp,
  offlineSince?: Timestamp,  // ✅ NEW: When device went offline
  // ... other fields
}
```

**Field Descriptions:**

- **status:** Current device status
  - Set to "online" when sensor data received
  - Set to "offline" by checkOfflineDevices scheduler
  - Manually set to "maintenance" or "error"

- **lastSeen:** Timestamp of last communication
  - Updated when sensor data received
  - Updated when status heartbeat received
  - Used to determine if device is offline

- **offlineSince:** Timestamp when device was marked offline
  - Set when status changes to "offline"
  - Cleared when device comes back online
  - Optional field (only exists when offline)
  - Useful for tracking downtime duration

---

## UI Impact

### Device Management Page

**Status Display:**
```tsx
const statusConfig: Record<DeviceStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },   // Green
  offline: { color: 'default', icon: <CloseCircleOutlined /> },  // Gray
  error: { color: 'error', icon: <WarningOutlined /> },          // Red
  maintenance: { color: 'warning', icon: <ToolOutlined /> },     // Orange
};
```

**User Experience:**
- ✅ Real-time status updates (within 5-10 minutes)
- ✅ Visual indicators (color-coded badges)
- ✅ Icons for quick identification
- ✅ Accurate representation of device connectivity

**Before Fix:**
```
Device A: [Green Badge] Online  ← Incorrect (device is off)
Device B: [Green Badge] Online  ← Correct
Device C: [Green Badge] Online  ← Incorrect (device disconnected)
```

**After Fix:**
```
Device A: [Gray Badge] Offline  ← Correct (last seen 15 min ago)
Device B: [Green Badge] Online  ← Correct (last seen 2 min ago)
Device C: [Gray Badge] Offline  ← Correct (last seen 12 min ago)
```

---

## Deployment

### Prerequisites
- Firebase Functions v2 SDK
- Scheduler permissions in Google Cloud

### Deploy Command
```bash
cd functions
npm run build
firebase deploy --only functions:checkOfflineDevices
```

### Verify Deployment
```bash
# Check function logs
firebase functions:log --only checkOfflineDevices

# Expected output every 5 minutes:
# "Starting offline device check..."
# "Offline check complete: X devices checked, Y marked as offline"
```

### Initial Deployment Notes
- Function will run for the first time on next 5-minute mark
- May take 1-2 cycles to stabilize status for all devices
- Check logs to ensure proper execution

---

## Monitoring & Logging

### Log Messages

**Normal Operation:**
```
✅ Starting offline device check...
✅ Offline check complete: 5 devices checked, 0 marked as offline
```

**Device Goes Offline:**
```
⚠️ Marking device arduino_uno_r4_001 as offline (last seen 12 minutes ago)
✅ Offline check complete: 5 devices checked, 1 marked as offline
```

**Device No lastSeen:**
```
⚠️ Device arduino_uno_r4_002 has no lastSeen timestamp, marking as offline
```

**Error:**
```
❌ Error checking offline devices: [error details]
```

### Metrics to Monitor

1. **Function Execution:**
   - Frequency: Should run every 5 minutes
   - Duration: Should complete in < 5 seconds
   - Errors: Should be 0

2. **Device Status Distribution:**
   - Online count
   - Offline count
   - Maintenance count
   - Error count

3. **Status Change Rate:**
   - Devices marked offline per check
   - Devices coming back online per check
   - Stability of device connectivity

---

## Testing Scenarios

### Test 1: Device Disconnect
**Steps:**
1. Ensure device is online and publishing
2. Power off device or disconnect network
3. Wait 10-15 minutes
4. Check Device Management page

**Expected Result:**
- Device status changes to "offline"
- offlineSince timestamp is set
- UI displays gray badge

### Test 2: Device Reconnect
**Steps:**
1. Start with offline device
2. Power on device or reconnect network
3. Wait for device to publish data (~5 minutes)
4. Check Device Management page

**Expected Result:**
- Device status changes to "online"
- offlineSince field is removed
- UI displays green badge

### Test 3: Grace Period
**Steps:**
1. Device is online
2. Simulate brief network interruption (< 5 minutes)
3. Device reconnects and publishes
4. Monitor status during interruption

**Expected Result:**
- Device remains "online" throughout
- No false offline detection
- lastSeen updates when reconnected

### Test 4: Maintenance Mode
**Steps:**
1. Set device to "maintenance" status
2. Disconnect device
3. Wait 15 minutes
4. Check device status

**Expected Result:**
- Device remains in "maintenance" status
- checkOfflineDevices skips this device
- Status not automatically changed

---

## Performance Impact

### Resource Usage

**Scheduled Function (checkOfflineDevices):**
- **Frequency:** Every 5 minutes (288 executions/day)
- **Duration:** ~1-3 seconds per execution
- **Firestore Reads:** 1 per device (e.g., 10 devices = 10 reads)
- **Firestore Writes:** 1 per offline device (batched)
- **Daily Firestore Operations:** 
  - Reads: 2,880 (for 10 devices)
  - Writes: Variable (only when status changes)

**Network Impact:**
- Minimal (internal Google Cloud operations)
- No external API calls
- No MQTT messages sent

**Cost Estimate (10 devices):**
- Function invocations: 288/day × $0.40/million = $0.00012/day
- Firestore reads: 2,880/day × $0.06/100k = $0.0017/day
- Firestore writes: ~10/day × $0.18/100k = $0.00002/day
- **Total: ~$0.002/day (~$0.73/year)**

---

## Troubleshooting

### Issue: Device Shows Offline But Is Publishing

**Possible Causes:**
1. lastSeen not being updated
2. Timezone issues with threshold calculation
3. Function not running

**Debug Steps:**
```bash
# Check function logs
firebase functions:log --only checkOfflineDevices

# Check device document in Firestore
# Verify lastSeen timestamp is recent

# Check processSensorData logs
firebase functions:log --only processSensorData
```

**Solution:**
- Verify processSensorData is updating lastSeen
- Check if Firestore write throttling is too aggressive
- Ensure device is actually sending data

---

### Issue: Device Shows Online But Is Disconnected

**Possible Causes:**
1. checkOfflineDevices not running
2. Threshold too large (> 10 minutes)
3. Recent sensor data cached

**Debug Steps:**
```bash
# Check last execution time
firebase functions:log --only checkOfflineDevices

# Verify device lastSeen in Firestore
# Should be > 10 minutes old if truly offline
```

**Solution:**
- Verify scheduler is running (check Cloud Scheduler in GCP)
- Check function deployment status
- Wait for next scheduled execution

---

### Issue: False Offline Detections

**Possible Causes:**
1. Network instability
2. Threshold too small
3. Device publish intervals changed

**Solution:**
- Increase OFFLINE_THRESHOLD_MS (e.g., to 15 minutes)
- Check device heartbeat frequency
- Verify network stability

---

## Future Enhancements

### 1. Configurable Thresholds
- Allow admin to set offline threshold per device
- Store in device metadata
- Useful for devices with different publish intervals

### 2. Offline Notifications
- Send email/SMS when device goes offline
- Integration with alerting system
- Configurable notification preferences

### 3. Status History
- Track status changes over time
- Store in separate collection or RTDB
- Enable uptime/downtime reporting

### 4. Ping-based Health Checks
- Implement ICMP ping for local network devices
- Requires Cloud Function with network access
- More immediate detection (but higher cost)

### 5. Device-Initiated Offline
- Device can send "going offline" message
- Immediate status update (no waiting for threshold)
- Useful for planned maintenance

---

## Conclusion

### ✅ Problem Solved

The device status management system now accurately reflects real-time device connectivity:

**Before:**
- ❌ Devices always showed as "online"
- ❌ No way to detect disconnected devices
- ❌ Misleading information for users

**After:**
- ✅ Devices automatically marked offline after 10 minutes
- ✅ Grace period prevents false positives
- ✅ Automatic recovery when device reconnects
- ✅ Accurate status display in UI
- ✅ Minimal performance impact

### Key Benefits

1. **Reliability:** 10-minute threshold with grace period
2. **Efficiency:** Scheduled checks every 5 minutes (batched)
3. **Accuracy:** Based on actual device communication (lastSeen)
4. **Automatic:** No manual intervention required
5. **Cost-effective:** ~$0.73/year for 10 devices

### Deployment Ready

✅ Function implemented and tested  
✅ Documentation complete  
✅ Logging and monitoring in place  
✅ UI compatible (no changes needed)  
✅ Performance optimized  

**Status:** Ready for production deployment

---

*Document Created: 2025-11-03*  
*Issue Resolved: Device Status Always Shows Online*  
*Solution: Automated Offline Detection via Scheduled Function*  
*Status: ✅ COMPLETE - READY FOR DEPLOYMENT*
