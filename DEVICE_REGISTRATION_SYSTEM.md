# Device Registration System Implementation

## Overview
This document describes the comprehensive device registration system that controls device lifecycle management through Server-Sent Events (SSE) communication.

## System Architecture

### Key Components

#### 1. Database Schema (`device.Model.js`)
- **New Field**: `isRegistered` (Boolean, default: false)
  - Determines if a device can transmit sensor data
  - Separate from `registrationStatus` for explicit control
- **Indexes Added**:
  - `{ isRegistered: 1, status: 1 }`
  - `{ deviceId: 1, isRegistered: 1 }`

#### 2. SSE Communication Layer (`sseConfig.js`)
- **Device SSE Connections**: Separate Map for device-to-server connections
  - `deviceSSEConnections` - Tracks active device connections
  - `setupDeviceSSEConnection()` - Establishes SSE for devices
  - `sendCommandToDevice()` - Sends commands to specific devices
  - `broadcastCommandToAllDevices()` - Broadcasts to all connected devices

#### 3. Device Lifecycle Endpoints

##### Registration Endpoints
```
POST /api/v1/devices/register
- Unregistered devices send device info
- Creates device with isRegistered: false
- Returns registration status
```

```
GET /api/v1/devices/sse/:deviceId
- Device establishes SSE connection
- Receives commands from server
- No authentication (uses API key)
```

```
POST /api/v1/devices/:id/approve
- Admin approves device registration
- Sets isRegistered: true
- Sends 'go' command via SSE
```

##### Data Transmission
```
POST /api/v1/devices/readings
- Modified to check isRegistered field
- Rejects readings if isRegistered: false
- Returns 403 error with specific code
```

##### Device Deletion
```
DELETE /api/v1/devices/:id
- Sends 'deregister' command via SSE
- Waits 1 second for device to receive command
- Deletes device and all associated data
```

## Device Communication Flow

### Phase 1: Initial Registration (Unregistered State)

**Device Behavior:**
1. Device powers on with `isRegistered = false`, `isApproved = false`
2. Establishes SSE connection to `/api/v1/devices/sse/:deviceId`
3. Sends registration requests every 5 seconds to `/api/v1/devices/register`
4. Does NOT read sensors or send data
5. Waits for "go" command from server

**Server Behavior:**
1. Receives registration request
2. Creates/updates device with `isRegistered: false`
3. Stores device metadata (name, firmware, MAC, IP, sensors)
4. Returns pending status via HTTP response
5. Maintains SSE connection with device

**Admin UI:**
- Device appears in "Unregistered Devices" tab
- Shows device information (ID, name, firmware, etc.)
- Admin can click "Register" to approve

### Phase 2: Admin Approval

**Admin Action:**
1. Admin opens RegisterDeviceModal
2. Enters location details (building, floor, notes)
3. Clicks "Register Device" button

**Server Processing:**
1. `POST /api/v1/devices/:id/approve` endpoint called
2. Updates device:
   - Sets `isRegistered: true`
   - Sets `registrationStatus: 'registered'`
   - Stores location metadata
3. Checks if device is connected via SSE
4. Sends "go" command via SSE:
```json
{
  "command": "go",
  "message": "Device registration approved. You can now start sending sensor data.",
  "device": { /* device data */ }
}
```

**Device Response:**
1. Receives "go" command via SSE
2. Sets `isRegistered = true`, `isApproved = true`
3. Stops sending registration requests
4. Begins sensor reading cycle
5. Starts publishing sensor data every 2 seconds

### Phase 3: Active Operation (Registered State)

**Device Behavior:**
1. Reads sensors (pH, turbidity, TDS) every 2 seconds
2. Publishes data to `/api/v1/devices/readings`
3. Maintains SSE connection for commands
4. Displays heartbeat LED animation during readings

**Server Behavior:**
1. Receives sensor data at `/api/v1/devices/readings`
2. Checks `isRegistered` field
3. Accepts data if `isRegistered: true`
4. Creates alerts if thresholds exceeded
5. Broadcasts updates to admin users via SSE

**Admin UI:**
- Device appears in "Registered Devices" tab
- Shows real-time sensor readings
- Displays device status and alerts
- Can view device details and history

### Phase 4: Device Deregistration

**Admin Action:**
1. Admin clicks "Delete" on a device
2. Confirms deletion in modal

**Server Processing:**
1. `DELETE /api/v1/devices/:id` endpoint called
2. Checks if device is connected via SSE
3. Sends "deregister" command via SSE:
```json
{
  "command": "deregister",
  "message": "Device has been removed from the system",
  "reason": "admin_deletion"
}
```
4. Waits 1 second for device to process
5. Deletes device from database
6. Deletes all sensor readings for device
7. Deletes all alerts for device

**Device Response:**
1. Receives "deregister" command via SSE
2. Sets `isRegistered = false`, `isApproved = false`
3. Stops sensor readings immediately
4. Returns to registration mode
5. Begins sending registration requests again

## Arduino Device Implementation

### State Management
```cpp
// Registration state variables
bool isRegistered = false;    // Device in database
bool isApproved = false;       // Admin approved (received "go")
bool sseConnected = false;     // SSE connection active
String sseBuffer = "";         // SSE message buffer
```

### Loop Structure
```cpp
void loop() {
  // Handle SSE connection
  if (sseConnected) {
    processSSEMessages();  // Check for commands
  } else {
    connectSSE();  // Reconnect if needed
  }
  
  // Behavior based on approval status
  if (!isApproved) {
    // REGISTRATION MODE
    sendRegistrationRequest();  // Every 5 seconds
  } else {
    // ACTIVE MODE
    readSensors();              // Every 2 seconds
    publishSensorData();        // Every 2 seconds
  }
}
```

### SSE Command Handling
```cpp
void processSSEMessages() {
  // Parse SSE event stream
  // Handle commands:
  
  if (command == "go") {
    // Device approved - start operations
    isRegistered = true;
    isApproved = true;
  }
  
  if (command == "deregister") {
    // Device removed - stop operations
    isRegistered = false;
    isApproved = false;
  }
  
  if (command == "wait") {
    // Registration pending
    isRegistered = true;
    isApproved = false;
  }
}
```

## Frontend Implementation

### Updated Components

#### Device Schema
```typescript
export const DeviceSchema = z.object({
  // ... existing fields
  registrationStatus: z.enum(['registered', 'pending']).optional(),
  isRegistered: z.boolean().optional(),
});

export const isDeviceRegistered = (device: Device): boolean => {
  if (device.isRegistered !== undefined) {
    return device.isRegistered;
  }
  // Fallback for legacy devices
  return !!(device.metadata?.location?.building);
};
```

#### Device Service
```typescript
async approveDeviceRegistration(
  deviceId: string,
  payload: UpdateDevicePayload
): Promise<DeviceResponse> {
  const response = await apiClient.post(
    `${DEVICE_ENDPOINTS.BY_ID(deviceId)}/approve`,
    payload
  );
  return response.data;
}
```

#### Device Mutations Hook
```typescript
const registerDevice = async (deviceId, building, floor, notes) => {
  const metadata = {
    location: { building, floor, notes }
  };
  const location = `${building} - ${floor}`;
  
  await devicesService.approveDeviceRegistration(deviceId, {
    location,
    metadata,
  });
};
```

## Error Handling

### Device-Side Errors
- **WiFi disconnected**: Device enters CONNECTING state, shows WiFi search animation
- **SSE connection failed**: Device retries every 10 seconds
- **Registration request failed**: Device continues attempting every 5 seconds
- **Sensor data rejected**: Device receives 403 error, continues registration mode

### Server-Side Errors
- **Device not found**: Returns 404 with `DEVICE_NOT_FOUND` error code
- **Device not registered**: Returns 403 with `DEVICE_NOT_REGISTERED` error code
- **Device not approved**: Returns 403 with `DEVICE_NOT_APPROVED` error code
- **SSE not connected**: Logs warning, device will receive command on next connection

## Security Considerations

### API Key Authentication
- All device endpoints require `x-api-key` header
- Validated by `ensureApiKey` middleware
- Prevents unauthorized device registration

### Admin-Only Operations
- Device approval requires admin role
- Device deletion requires admin role
- Enforced by `ensureAdmin` middleware

### SSE Connection Security
- Devices use SSL/TLS (HTTPS on port 443)
- Certificate verification disabled for Arduino compatibility
- API key required for SSE connection

## Database Cleanup

When a device is deleted:
1. Device document removed from `devices` collection
2. All sensor readings deleted from `sensorreadings` collection
3. All alerts deleted from `alerts` collection
4. Prevents orphaned data and maintains referential integrity

## Monitoring and Logging

### Server Logs
- Device registration attempts
- SSE connection/disconnection events
- Command delivery success/failure
- Device approval/deregistration actions

### Device Logs
- WiFi connection status
- SSE connection status
- Registration attempts and responses
- Command reception and processing
- Sensor reading and publishing status

## Benefits of This System

1. **Controlled Data Flow**: Only approved devices can send sensor data
2. **Real-Time Communication**: SSE enables instant command delivery
3. **Proper Lifecycle**: Clear states from registration to deregistration
4. **Data Integrity**: Automatic cleanup prevents orphaned records
5. **Admin Control**: Explicit approval process for new devices
6. **Scalable**: SSE supports multiple simultaneous device connections
7. **Reliable**: Automatic reconnection and retry mechanisms

## Testing Workflow

### Test Registration Flow
1. Flash Arduino with updated code
2. Device powers on and enters registration mode
3. Verify device appears in "Unregistered Devices" tab
4. Verify device is NOT sending sensor data
5. Approve device in admin panel
6. Verify "go" command sent via SSE
7. Verify device starts sending sensor data
8. Verify device appears in "Registered Devices" tab

### Test Deregistration Flow
1. Delete device from admin panel
2. Verify "deregister" command sent via SSE
3. Verify device stops sensor readings
4. Verify device returns to registration mode
5. Verify all sensor readings deleted
6. Verify all alerts deleted

## Backward Compatibility

- Legacy devices without `isRegistered` field use `registrationStatus`
- Frontend checks `isRegistered` first, falls back to location metadata
- Existing registered devices continue to work without changes
- Migration can be done gradually

## Future Enhancements

1. **Device Commands**: Additional commands beyond go/deregister
2. **Firmware Updates**: OTA updates via SSE commands
3. **Device Groups**: Batch operations on multiple devices
4. **Device Health**: Heartbeat monitoring and alerts
5. **Device Logs**: Remote log collection via SSE

---

**Implementation Date**: November 27, 2025  
**Version**: 1.0  
**Status**: Complete and Tested
