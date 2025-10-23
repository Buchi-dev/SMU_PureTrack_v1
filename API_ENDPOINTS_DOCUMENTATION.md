# Firebase Functions API Endpoints Documentation

## Base URLs
- **Device Management**: `https://us-central1-my-app-da530.cloudfunctions.net/deviceManagement`
- **Report Generation**: `https://us-central1-my-app-da530.cloudfunctions.net/generateReport`

---

## Device Management API

### Common Request Format
All device management requests use POST method with JSON body:
```json
{
  "action": "ACTION_NAME",
  "deviceId": "optional_device_id",
  "deviceData": {},
  "command": "optional_command",
  "params": {},
  "limit": 50
}
```

### Available Actions

#### 1. LIST_DEVICES
**Description**: Get all registered devices

**Request:**
```json
{
  "action": "LIST_DEVICES"
}
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "devices": [
    {
      "id": "arduino_uno_r4_001",
      "deviceId": "arduino_uno_r4_001",
      "name": "Water Quality Monitor 1",
      "type": "Arduino UNO R4 WiFi",
      "firmwareVersion": "1.0.0",
      "macAddress": "64:E8:33:5E:AF:E4",
      "ipAddress": "192.168.137.210",
      "sensors": ["turbidity", "tds", "ph"],
      "status": "online",
      "registeredAt": {
        "_seconds": 1761182549,
        "_nanoseconds": 427000000
      },
      "lastSeen": {
        "_seconds": 1761198996,
        "_nanoseconds": 339000000
      },
      "metadata": {
        "location": {
          "building": "asd",
          "floor": "2",
          "notes": "asx"
        }
      }
    }
  ]
}
```

**Device Properties:**
- `deviceId`: Unique device identifier (string)
- `name`: Human-readable device name (string)
- `type`: Device type (default: "Arduino UNO R4 WiFi")
- `firmwareVersion`: Firmware version (string)
- `macAddress`: MAC address (string)
- `ipAddress`: IP address (string)
- `sensors`: Array of sensor types ["turbidity", "tds", "ph"]
- `status`: "online" | "offline" | "error" | "maintenance"
- `registeredAt`: Firebase timestamp when device was registered
- `lastSeen`: Firebase timestamp of last communication
- `metadata`: Optional object containing:
  - `location`: Object with `building`, `floor`, `notes` (all strings)
  - `description`: Optional description
  - `owner`: Optional owner name

---

#### 2. GET_DEVICE
**Description**: Get a specific device by ID

**Request:**
```json
{
  "action": "GET_DEVICE",
  "deviceId": "arduino_uno_r4_001"
}
```

**Response:**
```json
{
  "success": true,
  "device": {
    // Same structure as in LIST_DEVICES
  }
}
```

---

#### 3. GET_SENSOR_READINGS
**Description**: Get latest sensor readings for a device

**Request:**
```json
{
  "action": "GET_SENSOR_READINGS",
  "deviceId": "arduino_uno_r4_001"
}
```

**Response:**
```json
{
  "success": true,
  "deviceId": "arduino_uno_r4_001",
  "sensorData": {
    "deviceId": "arduino_uno_r4_001",
    "ph": 12.24481,
    "tds": 437.542,
    "turbidity": 73.38705,
    "timestamp": 1677424,
    "receivedAt": 1761184218767
  }
}
```

**Sensor Data Properties:**
- `deviceId`: Device identifier (string)
- `ph`: pH level (number, 0-14 scale)
- `tds`: Total Dissolved Solids in ppm (number)
- `turbidity`: Turbidity in NTU (number)
- `timestamp`: Device timestamp in milliseconds (number)
- `receivedAt`: Server received timestamp in milliseconds (number)

---

#### 4. GET_SENSOR_HISTORY
**Description**: Get historical sensor readings for a device

**Request:**
```json
{
  "action": "GET_SENSOR_HISTORY",
  "deviceId": "arduino_uno_r4_001",
  "limit": 50
}
```

**Response:**
```json
{
  "success": true,
  "deviceId": "arduino_uno_r4_001",
  "count": 5,
  "history": [
    {
      "deviceId": "arduino_uno_r4_001",
      "ph": 12.24033,
      "tds": 436.8233,
      "turbidity": 73.36752,
      "timestamp": 1717786,
      "receivedAt": 1761184215952
    },
    // ... more readings (most recent first)
  ]
}
```

**Notes:**
- Results are ordered by most recent first
- Default limit is 50 if not specified
- Each reading has the same structure as GET_SENSOR_READINGS

---

#### 5. ADD_DEVICE
**Description**: Register a new device

**Request:**
```json
{
  "action": "ADD_DEVICE",
  "deviceId": "new_device_001",
  "deviceData": {
    "name": "New Monitor",
    "type": "Arduino UNO R4 WiFi",
    "firmwareVersion": "1.0.0",
    "macAddress": "XX:XX:XX:XX:XX:XX",
    "ipAddress": "192.168.1.100",
    "sensors": ["turbidity", "tds", "ph"],
    "status": "online",
    "metadata": {
      "location": {
        "building": "Main Building",
        "floor": "1",
        "notes": "Near entrance"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device added successfully",
  "data": {
    "deviceId": "new_device_001",
    "device": {
      // Complete device object
    }
  }
}
```

---

#### 6. UPDATE_DEVICE
**Description**: Update an existing device

**Request:**
```json
{
  "action": "UPDATE_DEVICE",
  "deviceId": "arduino_uno_r4_001",
  "deviceData": {
    "name": "Updated Name",
    "status": "maintenance",
    "metadata": {
      "location": {
        "building": "Updated Building",
        "floor": "3"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device updated successfully",
  "data": {
    "deviceId": "arduino_uno_r4_001"
  }
}
```

---

#### 7. DELETE_DEVICE
**Description**: Delete a device

**Request:**
```json
{
  "action": "DELETE_DEVICE",
  "deviceId": "arduino_uno_r4_001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device deleted successfully",
  "data": {
    "deviceId": "arduino_uno_r4_001"
  }
}
```

---

#### 8. SEND_COMMAND
**Description**: Send a command to a device

**Request:**
```json
{
  "action": "SEND_COMMAND",
  "deviceId": "arduino_uno_r4_001",
  "command": "STATUS",
  "params": {
    "option": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Command sent to device: arduino_uno_r4_001"
}
```

---

#### 9. DISCOVER_DEVICES
**Description**: Trigger device discovery on the network

**Request:**
```json
{
  "action": "DISCOVER_DEVICES"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discovery message sent to devices"
}
```

---

## Data Models Summary

### Device Model
```typescript
interface Device {
  id: string;
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: "online" | "offline" | "error" | "maintenance";
  registeredAt: FirebaseTimestamp;
  lastSeen: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
  metadata?: {
    location?: {
      building: string;
      floor: string;
      notes?: string;
    };
    description?: string;
    owner?: string;
  };
}
```

### Sensor Reading Model
```typescript
interface SensorReading {
  deviceId: string;
  ph: number;          // 0-14
  tds: number;         // ppm
  turbidity: number;   // NTU
  timestamp: number;   // milliseconds
  receivedAt: number;  // milliseconds
}
```

---

## Important Notes

1. **No Temperature or Dissolved Oxygen**: The current sensor schema only includes:
   - pH (0-14)
   - TDS (Total Dissolved Solids in ppm)
   - Turbidity (in NTU)

2. **Timestamps**: 
   - Device timestamps might be relative (from device boot)
   - Use `receivedAt` for accurate server-side timestamps

3. **Location Data**: 
   - Stored in `metadata.location` object
   - Can be string or object with building/floor/notes

4. **Status Values**:
   - "online": Device is active and communicating
   - "offline": Device is not responding
   - "error": Device has an error condition
   - "maintenance": Device is under maintenance

5. **Default Thresholds** (from backend):
   ```typescript
   tds: {
     warningMax: 500,
     criticalMax: 1000,
     unit: "ppm"
   },
   ph: {
     warningMin: 6.0,
     warningMax: 8.5,
     criticalMin: 5.5,
     criticalMax: 9.0
   },
   turbidity: {
     warningMax: 5,
     criticalMax: 10,
     unit: "NTU"
   }
   ```

---

## Error Responses

All endpoints return this format on error:
```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP Status Codes:
- 200: Success
- 400: Bad request (missing parameters)
- 404: Resource not found
- 500: Server error
