# Device Status Fix - UI vs Firestore Discrepancy

## Issue Description
Device was showing as "Online" in the UI but "Offline" in Firestore database.

## Root Cause Analysis

### Architecture Overview
The system uses TWO separate data sources for device information:

1. **Firestore** (Source of Truth for Device Status)
   - Stores device documents with `status` field
   - Updated by backend Cloud Functions
   - Managed by scheduled jobs

2. **Realtime Database (RTDB)** (Live Sensor Data)
   - Stores real-time sensor readings
   - Updated instantly when devices send data via MQTT
   - Independent from Firestore device status

### The Problem
The UI was incorrectly **overriding Firestore status** when it received RTDB sensor data:

```typescript
// ❌ BEFORE (INCORRECT):
const unsubscribe = deviceManagementService.subscribeToMultipleDevices(
  deviceIds,
  (deviceId, reading) => {
    if (reading) {
      // BUG: Overriding Firestore status based on RTDB data
      setDevices((prev) =>
        prev.map((device) =>
          device.deviceId === deviceId
            ? { ...device, status: 'online', lastSeen: { seconds: Date.now() / 1000 } }
            : device
        )
      );
    }
  }
);
```

### Why This Caused Issues

1. **Device sends sensor data** → RTDB gets updated immediately
2. **processSensorData Cloud Function** updates Firestore `lastSeen` with 60-second throttling
3. **checkOfflineDevices scheduler** runs every 5 minutes:
   - Marks devices offline if `lastSeen` > 10 minutes old
   - Accounts for throttling and network delays
4. **UI subscribes to RTDB** → Sees live data → Incorrectly shows "online"
5. **Firestore shows "offline"** → Scheduler marked it offline correctly

### Timing Example

```
00:00 - Device sends data → RTDB updated
00:01 - Firestore lastSeen updated (not throttled)
00:05 - checkOfflineDevices runs → Device still online
00:10 - checkOfflineDevices runs → Device still online
00:12 - Device stops sending data
00:15 - checkOfflineDevices runs → lastSeen was 00:01 (14 min ago) → Mark OFFLINE ✓
00:16 - RTDB still has cached data from 00:12 (4 min old)
00:16 - UI sees RTDB data → Incorrectly shows ONLINE ❌
```

## Solution Implemented

### Changes Made

#### 1. `client/src/pages/admin/AdminDeviceManagement/hooks/useDeviceManagement.ts`
- **Removed**: Status override based on RTDB data
- **Kept**: RTDB subscription for monitoring (logging only)
- **Result**: Firestore status is now the single source of truth

```typescript
// ✅ AFTER (CORRECT):
const unsubscribe = deviceManagementService.subscribeToMultipleDevices(
  deviceIds,
  (deviceId, reading) => {
    // Only log - don't override status
    console.log(`📡 Real-time data received from ${deviceId}`, reading);
    // Status comes from Firestore only
  },
  (deviceId, err) => {
    console.error(`Real-time error for device ${deviceId}:`, err);
    // Don't change status on RTDB errors
  }
);
```

#### 2. `client/src/hooks/useDevices.ts`
- **Removed**: `status: 'online'` override when RTDB data received
- **Kept**: `latestReading` updates from RTDB
- **Result**: Shows live sensor data without changing device status

```typescript
// ✅ AFTER (CORRECT):
setDevices((prev) =>
  prev.map((d) =>
    d.deviceId === deviceId
      ? { ...d, latestReading: reading } // Only update reading, not status
      : d
  )
);
```

#### 3. New Component: `client/src/components/DataStreamIndicator.tsx`
- **Purpose**: Show real-time data availability separately from device status
- **Features**:
  - Green badge: Live data (< 5 minutes)
  - Yellow badge: Stale data (5-15 minutes)
  - Gray badge: No recent data (> 15 minutes)
- **Usage**: Can be added to device tables/cards to show data stream health

## System Behavior After Fix

### Device Status Flow
```
┌─────────────┐
│   Device    │
└──────┬──────┘
       │
       ├─────MQTT────────► MQTT Bridge
       │                        │
       │                        ├──► Pub/Sub Topic
       │                        │         │
       │                        │         ▼
       │                        │    processSensorData
       │                        │         │
       │                        │         ├──► Update RTDB (instant)
       │                        │         └──► Update Firestore (throttled)
       │                        │
       │                        │
       ▼                        ▼
┌─────────────┐         ┌─────────────┐
│    RTDB     │         │  Firestore  │ ◄─── checkOfflineDevices
│ (readings)  │         │  (status)   │      (every 5 min)
└──────┬──────┘         └──────┬──────┘
       │                        │
       │                        │
       └────────┬───────────────┘
                │
                ▼
         ┌─────────────┐
         │     UI      │
         │             │
         │ Status: ✓   │ ◄── From Firestore
         │ Data: ✓     │ ◄── From RTDB
         └─────────────┘
```

### What Users See Now

| Scenario | Firestore Status | RTDB Data | UI Shows | Correct? |
|----------|-----------------|-----------|----------|----------|
| Device sending data | Online | Recent | Online ✓ | ✅ Yes |
| Device stopped < 10min | Online | Stale | Online ✓ | ✅ Yes |
| Device stopped > 10min | Offline | Stale | Offline ✓ | ✅ Yes |
| Device stopped > 10min | Offline | Recent* | Offline ✓ | ✅ Yes |

*Note: Recent RTDB data with Offline status can happen briefly during transitions

## Backend Functions (No Changes Needed)

These functions continue to work correctly:

### 1. `processSensorData` Cloud Function
- Updates device `lastSeen` timestamp
- Sets status to "online"
- Throttled to prevent excessive writes (60 seconds)
- **Location**: `functions/src/pubsub/processSensorData.ts`

### 2. `checkOfflineDevices` Scheduler
- Runs every 5 minutes
- Checks if `lastSeen` > 10 minutes old
- Marks devices as offline
- **Location**: `functions/src/scheduler/checkOfflineDevices.ts`

### 3. `autoRegisterDevice` Cloud Function
- Sets device to "online" when first registered
- Updates `lastSeen` on registration
- **Location**: `functions/src/pubsub/autoRegisterDevice.ts`

## Testing the Fix

### Manual Testing Steps

1. **Verify Initial State**
   ```bash
   # Check Firestore status
   - Open Firebase Console → Firestore → devices collection
   - Note the status field for test device
   ```

2. **Test Online Device**
   - Device should be sending data via MQTT
   - UI should show "Online" badge
   - Firestore should show `status: "online"`
   - Check logs: Should see "📡 Real-time data received"

3. **Test Offline Transition**
   - Stop the device (unplug or stop Arduino)
   - Wait 10-15 minutes
   - Scheduler will mark as offline
   - UI should update to show "Offline" badge
   - Firestore should show `status: "offline"`

4. **Test Data Stream Indicator** (if implemented)
   - Should show green when data < 5 min old
   - Should show yellow when data 5-15 min old
   - Should show gray when data > 15 min old

### Expected Console Logs

```javascript
// When data received
📡 Real-time data received from esp32_dev_001 {
  timestamp: 1730764800000,
  ph: 7.2,
  tds: 450,
  turbidity: 3.5
}

// No status override
✅ Devices loaded: 2 devices found
// Device status remains as per Firestore
```

## Configuration

### Timing Constants
Located in: `functions/src/constants/timing.constants.ts`

```typescript
// How often to check for offline devices
DEFAULT_CHECK_INTERVAL_MINUTES = 5

// Device marked offline if lastSeen older than this
OFFLINE_THRESHOLD = CHECK_INTERVAL × 2 = 10 minutes

// Throttle Firestore lastSeen updates
LASTSEEN_UPDATE_THRESHOLD_MS = 60000 (60 seconds)
```

### To Adjust Thresholds

1. Edit `systemConfig/timing` in Firestore:
   ```json
   {
     "checkIntervalMinutes": 5,
     "offlineThresholdMultiplier": 2
   }
   ```

2. Or update constants in code and redeploy functions

## Benefits of This Fix

1. ✅ **Consistent Status Display**: UI matches database
2. ✅ **Single Source of Truth**: Firestore manages all status logic
3. ✅ **Proper Separation**: RTDB for data, Firestore for metadata
4. ✅ **Backend Control**: Status determined by validated backend logic
5. ✅ **Better Reliability**: No race conditions between UI and backend

## Future Enhancements

### Optional: Add Data Stream Health Indicator
To show users both device status AND data availability:

```tsx
<Space>
  <Tag color={device.status === 'online' ? 'success' : 'default'}>
    {device.status.toUpperCase()}
  </Tag>
  <DataStreamIndicator 
    hasRecentData={hasRecentReading} 
    lastDataTime={device.latestReading?.timestamp}
  />
</Space>
```

### Optional: Real-time Status Updates
Instead of polling, listen to Firestore status changes:

```typescript
// In useDeviceManagement.ts
const unsubscribe = onSnapshot(
  collection(firestore, 'devices'),
  (snapshot) => {
    const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDevices(devices);
  }
);
```

## Related Files

- ✅ Fixed: `client/src/pages/admin/AdminDeviceManagement/hooks/useDeviceManagement.ts`
- ✅ Fixed: `client/src/hooks/useDevices.ts`
- ⭐ New: `client/src/components/DataStreamIndicator.tsx`
- 📄 Backend: `functions/src/pubsub/processSensorData.ts`
- 📄 Backend: `functions/src/scheduler/checkOfflineDevices.ts`
- 📄 Backend: `functions/src/constants/timing.constants.ts`

## Summary

**Problem**: UI showed "Online" but Firestore showed "Offline"  
**Cause**: UI was incorrectly overriding Firestore status with RTDB data availability  
**Solution**: Made Firestore the single source of truth for device status  
**Result**: UI now accurately reflects actual device status from backend

---

**Date Fixed**: November 4, 2025  
**Modified Files**: 2 files updated, 1 new component created  
**Breaking Changes**: None - improvement only
