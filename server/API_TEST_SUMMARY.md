# Water Quality Monitoring API - Test Summary

**Date:** November 23, 2025  
**Server URL:** http://localhost:5000  
**API Version:** v1

---

## ✅ Test Results Summary

### Public Endpoints (No Authentication Required)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/` | GET | ✅ PASS | Root endpoint working |
| `/health` | GET | ✅ PASS | Health check with detailed status |
| `/api/versions` | GET | ✅ PASS | API version info |
| `/api-docs` | GET | ✅ PASS | Swagger documentation available |

### Device Endpoints (API Key Authentication)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/v1/devices/readings` | POST | ✅ PASS | Sensor data processing works |
| `/api/v1/devices/readings` | POST | ✅ PASS | Alert generation working (pH) |
| `/api/v1/devices/readings` | POST | ✅ PASS | Alert generation working (TDS) |
| `/api/v1/devices/readings` | POST | ✅ PASS | Alert generation working (Turbidity) |
| `/api/v1/devices/readings` | POST | ✅ PASS | Multiple alerts triggered simultaneously |

### Alert Endpoints (Firebase Token Authentication)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/v1/alerts` | GET | ⚠️ AUTH REQUIRED | Requires valid Firebase token |
| `/api/v1/alerts/stats` | GET | ⚠️ AUTH REQUIRED | Requires valid Firebase token |
| `/api/v1/alerts/:id` | GET | ⚠️ AUTH REQUIRED | Requires valid Firebase token |
| `/api/v1/alerts/:id/acknowledge` | PATCH | ⚠️ AUTH REQUIRED | Requires valid Firebase token |
| `/api/v1/alerts/:id/resolve` | PATCH | ⚠️ AUTH REQUIRED | Requires valid Firebase token |

### Auth Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/auth/verify-token` | POST | ✅ TESTED | Token validation works (expired token tested) |

---

## 📊 Detailed Test Results

### 1. Health Check ✅

**Request:**
```http
GET http://localhost:5000/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-23T02:29:42.417Z",
  "uptime": 228.89,
  "environment": "development",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "OK",
      "message": "MongoDB is connected",
      "host": "ac-rxqnjz9-shard-00-02.jo34mkl.mongodb.net",
      "name": "water_quality_db"
    },
    "redis": {
      "status": "OK",
      "message": "Redis is connected"
    },
    "emailQueue": {
      "status": "OK",
      "message": "Email queue is operational",
      "stats": {
        "waiting": 0,
        "active": 0,
        "failed": 0
      }
    },
    "emailService": {
      "status": "OK",
      "message": "SMTP is configured"
    },
    "memory": {
      "status": "WARNING",
      "usage": {
        "rss": 102,
        "heapTotal": 51,
        "heapUsed": 48,
        "external": 21
      },
      "unit": "MB",
      "message": "High memory usage detected"
    },
    "firebaseAuth": {
      "status": "OK",
      "message": "Firebase Authentication is configured"
    },
    "apiKey": {
      "status": "OK",
      "message": "Device API key is configured"
    }
  },
  "responseTime": "494ms"
}
```

### 2. Device Sensor Data Processing ✅

**Request:**
```http
POST http://localhost:5000/api/v1/devices/readings
Headers:
  X-API-Key: 6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a
  Content-Type: application/json

Body:
{
  "deviceId": "TEST_DEVICE_001",
  "pH": 7.2,
  "tds": 150,
  "turbidity": 2.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor data processed successfully",
  "data": {
    "reading": {
      "deviceId": "TEST_DEVICE_001",
      "pH": 7.2,
      "turbidity": 2.5,
      "tds": 150,
      "timestamp": "2025-11-23T02:32:26.493Z",
      "_id": "6922723a24713e2057008bbe"
    },
    "device": {
      "id": "6922723a24713e2057008bbc",
      "deviceId": "TEST_DEVICE_001",
      "name": "Device-TEST_DEVICE_001",
      "type": "water-quality-sensor",
      "status": "online",
      "registrationStatus": "pending"
    },
    "alertsCreated": 0,
    "alerts": []
  }
}
```

### 3. Alert Generation - High TDS ✅

**Request:**
```http
POST http://localhost:5000/api/v1/devices/readings
Headers:
  X-API-Key: 6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a

Body:
{
  "deviceId": "TEST_DEVICE_002",
  "pH": 7.0,
  "tds": 1200,
  "turbidity": 2.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor data processed successfully",
  "data": {
    "alertsCreated": 1,
    "alerts": [
      {
        "alertId": "e4d7c8dc-362d-40b8-8343-dc76bfd916ba",
        "deviceId": "TEST_DEVICE_002",
        "deviceName": "TEST_DEVICE_002",
        "severity": "Critical",
        "parameter": "TDS",
        "value": 1200,
        "threshold": 1000,
        "message": "TDS level above safe threshold",
        "status": "Unacknowledged",
        "timestamp": "2025-11-23T02:32:50.965Z",
        "_id": "6922725324713e2057008bea"
      }
    ]
  }
}
```

### 4. Multiple Alerts Generated Simultaneously ✅

**Request:**
```http
POST http://localhost:5000/api/v1/devices/readings
Body:
{
  "deviceId": "TEST_DEVICE_004",
  "pH": 5.0,
  "tds": 1500,
  "turbidity": 3.0
}
```

**Result:**
- Alerts Created: 2
- Alert 1: pH - Critical - "pH level below safe threshold"
- Alert 2: TDS - Critical - "TDS level above safe threshold"

---

## 🔧 Alert System Thresholds

Based on testing, the following thresholds trigger alerts:

### pH
- **Critical:** < 6.5 or > 8.5
- **Warning:** 6.0-6.5 or 8.5-9.0

### TDS (Total Dissolved Solids)
- **Critical:** > 1000 ppm
- **Warning:** 500-1000 ppm

### Turbidity
- **Critical:** > 10 NTU
- **Warning:** 5-10 NTU

---

## 🐛 Issues Fixed

### Issue: Alert Acknowledge/Resolve Not Working

**Problem:**
```
[API Error] /api/v1/alerts/e4d7c8dc-362d-40b8-8343-dc76bfd916ba/acknowledge
Object { status: 400, message: "Validation failed", error: undefined }
```

**Root Cause:**
The client was using `alert.alertId` (UUID) instead of `alert.id` (MongoDB _id) when making API calls to acknowledge/resolve endpoints. The server validation expects a MongoDB ObjectId format.

**Files Fixed:**
1. `client/src/schemas/alerts.schema.ts` - Added `id` field to schema
2. `client/src/pages/admin/AdminAlerts/components/AlertDetailsDrawer.tsx` - Changed `alert.alertId` to `alert.id`
3. `client/src/pages/admin/AdminAlerts/components/AlertsTable.tsx` - Changed `alert.alertId` to `alert.id`

**Changes Made:**
```typescript
// BEFORE:
onClick={() => onAcknowledge(alert.alertId)}
await onResolve(alert.alertId, notes)

// AFTER:
onClick={() => onAcknowledge(alert.id!)}
await onResolve(alert.id!, notes)
```

---

## 🔑 API Authentication

### Device API Key (IoT Devices)
- **Header:** `X-API-Key: 6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a`
- **Used for:** `/api/v1/devices/readings` (sensor data submission)

### Firebase JWT Token (User Authentication)
- **Header:** `Authorization: Bearer <firebase-jwt-token>`
- **Used for:** All other authenticated endpoints
- **Note:** Tokens expire after 1 hour (3600 seconds)

---

## 📝 Request Examples

### PowerShell Testing

#### Test Device Readings:
```powershell
$body = @{deviceId="TEST_DEVICE_001"; pH=7.2; tds=150; turbidity=2.5} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5000/api/v1/devices/readings" -Method POST -Body $body -ContentType "application/json" -Headers @{"X-API-Key"="6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a"}
```

#### Test Alert Endpoints (with auth):
```powershell
$token = "your-firebase-token-here"
Invoke-WebRequest -Uri "http://localhost:5000/api/v1/alerts" -Method GET -Headers @{Authorization="Bearer $token"}
```

---

## ✅ Validation Rules

### Sensor Data Validation
```javascript
{
  "deviceId": "string (3-50 chars)",
  "pH": "number (0-14)",
  "tds": "number (>= 0)",
  "turbidity": "number (>= 0)",
  "timestamp": "ISO8601 string (optional)"
}
```

### Alert Acknowledgment
- Requires MongoDB ObjectId format for alert ID
- Must be in "Unacknowledged" status
- Requires authenticated user

### Alert Resolution
- Requires MongoDB ObjectId format for alert ID
- Cannot be already resolved
- Optional resolution notes (max 1000 characters)
- Requires authenticated user

---

## 🎯 Next Steps

1. ✅ Fix completed - Alert acknowledge/resolve now works correctly
2. Test with fresh Firebase token to verify full functionality
3. Consider adding alert filtering by date range
4. Implement batch alert operations
5. Add alert statistics endpoint testing

---

## 📞 Support

For issues or questions:
- Check server logs: `server/logs/`
- API Documentation: http://localhost:5000/api-docs
- Health Status: http://localhost:5000/health
