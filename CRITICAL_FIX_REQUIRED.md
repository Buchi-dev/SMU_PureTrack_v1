# ⚠️ CRITICAL FIX REQUIRED - ESP32 Configuration

## 🔴 Field Name Case Mismatch Detected

### Problem:
The ESP32 sends `"ph"` (lowercase) but the server expects `"pH"` (capital H).

### ESP32 Code (Current):
```cpp
// Line 265 in ESP32_Dev_Module.ino
StaticJsonDocument<256> doc;
doc["deviceId"] = DEVICE_ID;
doc["tds"] = tds;
doc["ph"] = ph;                    // ❌ LOWERCASE
doc["turbidity"] = turbidity;
```

### Server Validation (Current):
```javascript
// server/src/middleware/validation.middleware.js
body('pH')  // ✅ CAPITAL H
  .notEmpty().withMessage('pH value is required')
  .isFloat({ min: 0, max: 14 })
```

---

## ✅ RECOMMENDED FIX

### Option 1: Fix ESP32 (RECOMMENDED)
Change line 265 in `ESP32_Dev_Module.ino`:

**Before:**
```cpp
doc["ph"] = ph;
```

**After:**
```cpp
doc["pH"] = ph;  // Capital H to match scientific notation
```

**Why this option?**
- ✅ Maintains scientific notation standard (pH not ph)
- ✅ Matches MongoDB schema field name
- ✅ Consistent with chemistry conventions
- ✅ Single line change

---

## 📋 MANDATORY CONFIGURATION CHECKLIST

Before deploying the ESP32 device, you MUST update these values:

### 1. WiFi Credentials (Lines 29-30)
```cpp
#define WIFI_SSID "Yuzon Only"           // ✅ Update with your WiFi name
#define WIFI_PASSWORD "Pldtadmin@2024"   // ✅ Update with your WiFi password
```

### 2. Server Configuration (Lines 33-35)
```cpp
#define API_SERVER "http://your-server-ip:5000"  // ❌ MUST UPDATE
#define API_ENDPOINT "/api/v1/devices/readings"  // ✅ Already correct
#define API_KEY "your_device_api_key_here"       // ❌ MUST UPDATE
```

**Examples:**
```cpp
// Local network deployment:
#define API_SERVER "http://192.168.1.100:5000"

// Cloud deployment:
#define API_SERVER "https://water-api.yourdomain.com"

// Strong API key:
#define API_KEY "wqm_prod_8a7b9c1d2e3f4g5h6i7j8k9l0m1n2o3p"
```

### 3. Device Identification (Line 38)
```cpp
#define DEVICE_ID "esp32_dev_002"  // ✅ Make unique for each device
```

**Naming convention:**
- Device 1: `"esp32_dev_001"`
- Device 2: `"esp32_dev_002"`
- Device 3: `"esp32_dev_003"`
- Location-based: `"esp32_buildingA_tank1"`

---

## 🔐 SERVER CONFIGURATION

Ensure your `server/.env` file has matching configuration:

```bash
# MUST MATCH ESP32 API_KEY
DEVICE_API_KEY=wqm_prod_8a7b9c1d2e3f4g5h6i7j8k9l0m1n2o3p

# Server port (must be accessible from ESP32)
PORT=5000

# MongoDB connection
MONGO_URI=mongodb://localhost:27017/water_quality_db

# Email notifications (optional but recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 🧪 TESTING PROCEDURE

### Step 1: Test Server Connectivity
```bash
# On ESP32 network, test if server is reachable
curl http://your-server-ip:5000/health
# Should return: {"status":"healthy"}
```

### Step 2: Test API Key
```bash
curl -X POST http://your-server-ip:5000/api/v1/devices/readings \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_device_api_key_here" \
  -d '{
    "deviceId": "esp32_dev_002",
    "pH": 7.0,
    "turbidity": 2.5,
    "tds": 300,
    "timestamp": "2025-11-21T10:00:00.000Z"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Sensor data processed successfully",
  "data": {
    "reading": {...},
    "device": {...},
    "alertsCreated": 0
  }
}
```

### Step 3: Upload to ESP32
1. Fix the `doc["pH"]` line (line 265)
2. Update WiFi credentials
3. Update API_SERVER
4. Update API_KEY
5. Update DEVICE_ID
6. Upload to ESP32
7. Open Serial Monitor (115200 baud)
8. Watch for connection confirmation

### Step 4: Verify Data Flow
1. Check MongoDB for new device: `db.devices.find()`
2. Check sensor readings: `db.sensorreadings.find().sort({timestamp:-1}).limit(1)`
3. Check server logs: `pm2 logs` or `docker logs <container_name>`
4. Check client dashboard for real-time data

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: ESP32 Can't Connect to WiFi
**Symptoms:** WiFi.status() != WL_CONNECTED
**Solutions:**
- ✅ Verify SSID and password are correct
- ✅ Check WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- ✅ Ensure WiFi network is not hidden
- ✅ Check ESP32 is within WiFi range

### Issue 2: Server Returns 401 Unauthorized
**Symptoms:** HTTP code 401
**Solutions:**
- ✅ Verify API_KEY matches DEVICE_API_KEY in server .env
- ✅ Check x-api-key header is being sent
- ✅ Restart server after changing .env file

### Issue 3: Server Returns 400 Bad Request
**Symptoms:** HTTP code 400, "Validation failed"
**Solutions:**
- ✅ Fix pH field name (doc["pH"] not doc["ph"])
- ✅ Ensure all required fields are present
- ✅ Check sensor values are in valid ranges

### Issue 4: No Data in Database
**Symptoms:** Server returns 200 but no data stored
**Solutions:**
- ✅ Verify MongoDB is running: `mongosh` or `docker ps`
- ✅ Check MONGO_URI in server .env
- ✅ Check server logs for database errors

### Issue 5: Rate Limit Exceeded
**Symptoms:** HTTP code 429
**Solutions:**
- ✅ Increase SENSOR_READ_INTERVAL in ESP32 (currently 2000ms)
- ✅ Increase sensorDataLimiter max in server (currently 1000)
- ✅ Check for multiple devices using same IP

---

## 📊 EXPECTED BEHAVIOR

### Normal Operation:
```
[ESP32] → Read sensors (50 samples, ~150µs)
          ↓
[ESP32] → Compute values (TDS, pH, turbidity)
          ↓
[ESP32] → Build JSON payload
          ↓
[ESP32] → HTTP POST to server
          ↓
[Server] → Validate API key ✅
          ↓
[Server] → Validate payload ✅
          ↓
[Server] → Save to MongoDB ✅
          ↓
[Server] → Check thresholds
          ↓
[Server] → Create alert if needed
          ↓
[Server] → Return 200 OK
          ↓
[ESP32] → serverConnected = true
          ↓
[ESP32] → Wait 2 seconds, repeat
```

### Alert Triggering:
```
pH = 5.8 (below 6.0 critical threshold)
          ↓
[Server] → Create CRITICAL alert
          ↓
[Server] → Check for duplicate (within 1 hour)
          ↓
[Server] → If no duplicate, save alert
          ↓
[Server] → Queue email notification
          ↓
[Email] → Send to admin/staff
          ↓
[Client] → Real-time alert appears on dashboard
```

---

## 🎯 DEPLOYMENT CHECKLIST

- [ ] Fix `doc["pH"]` in ESP32_Dev_Module.ino (line 265)
- [ ] Update WIFI_SSID and WIFI_PASSWORD
- [ ] Update API_SERVER with actual server IP/domain
- [ ] Generate strong API_KEY (32+ characters)
- [ ] Update API_KEY in ESP32 code
- [ ] Update DEVICE_API_KEY in server/.env (must match)
- [ ] Set unique DEVICE_ID for each ESP32
- [ ] Test server health endpoint
- [ ] Test API endpoint with curl
- [ ] Upload code to ESP32
- [ ] Monitor Serial output for connection
- [ ] Verify device auto-registers in MongoDB
- [ ] Verify sensor readings are being saved
- [ ] Test threshold alert by sending extreme values
- [ ] Set up email notifications (SMTP)
- [ ] Configure admin/staff users in system
- [ ] Set device location in admin panel
- [ ] Approve device registration (change status to 'registered')

---

## 🔗 QUICK LINKS

- **Full Analysis:** See `ESP32_DATA_FLOW_ANALYSIS.md`
- **Server Setup:** See `server/README.md`
- **Client Setup:** See `client/README.md`
- **API Documentation:** http://your-server:5000/api-docs (Swagger)

---

**Last Updated:** November 21, 2025  
**Status:** ⚠️ REQUIRES CONFIGURATION BEFORE DEPLOYMENT
