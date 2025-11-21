# Water Quality Monitoring System - API Documentation

## Overview

This document provides a comprehensive overview of all server API endpoints and their corresponding client service implementations.

**Base URL:** `http://localhost:5000` (development)

**Authentication:** Firebase ID Token via `Authorization: Bearer <token>` header

**API Version:** `/api/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users Management](#users-management)
3. [Alerts Management](#alerts-management)
4. [Devices Management](#devices-management)
5. [Reports Management](#reports-management)
6. [Analytics](#analytics)
7. [Client Service Layer](#client-service-layer)

---

## Authentication

**Base Path:** `/auth`

### Endpoints

#### 1. Verify Firebase Token
**POST** `/auth/verify-token`

Verifies Firebase ID token and syncs user to MongoDB database.

**Request Body:**
```json
{
  "idToken": "firebase-id-token-here"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "staff",
    "status": "active",
    "profileComplete": true
  },
  "message": "Token verified successfully"
}
```

**Client Implementation:** `authService.verifyToken(idToken)`

---

#### 2. Get Current User
**GET** `/auth/current-user`

Returns currently authenticated user information.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "staff",
    "status": "active"
  }
}
```

**Client Implementation:** `authService.getCurrentUser()`

---

#### 3. Check Authentication Status
**GET** `/auth/status`

Checks if user is authenticated (optional auth).

**Response:**
```json
{
  "authenticated": true,
  "user": { /* user object */ }
}
```

**Client Implementation:** `authService.checkStatus()`

---

#### 4. Logout
**POST** `/auth/logout`

Logs out user (client should also sign out from Firebase).

**Response:**
```json
{
  "success": true,
  "message": "Logout successful. Clear Firebase session on client."
}
```

**Client Implementation:** `authService.logout()`

---

## Users Management

**Base Path:** `/api/v1/users`

**Authentication Required:** Yes (varies by endpoint)

### Endpoints

#### 1. Get All Users
**GET** `/api/v1/users`

Get all users with optional filters (admin only).

**Query Parameters:**
- `role` - Filter by role (admin/staff)
- `status` - Filter by status (active/pending/suspended)
- `search` - Search by name/email
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "user-id",
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "staff",
      "status": "active"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

**Client Implementation:** `userService.getAllUsers(filters)`

---

#### 2. Get User by ID
**GET** `/api/v1/users/:id`

Get specific user by ID (authenticated users).

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "staff",
    "status": "active"
  }
}
```

**Client Implementation:** `userService.getUserById(userId)`

---

#### 3. Update User Role
**PATCH** `/api/v1/users/:id/role`

Update user role (admin only).

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated user */ },
  "message": "User role updated successfully",
  "requiresLogout": false
}
```

**Client Implementation:** `userService.updateUserRole(userId, role)`

---

#### 4. Update User Status
**PATCH** `/api/v1/users/:id/status`

Update user status (admin only).

**Request Body:**
```json
{
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated user */ },
  "message": "User status updated successfully",
  "requiresLogout": false
}
```

**Client Implementation:** `userService.updateUserStatus(userId, status)`

---

#### 5. Update User Profile
**PATCH** `/api/v1/users/:id/profile`

Update user profile (admin only for other users).

**Request Body:**
```json
{
  "displayName": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "department": "Engineering",
  "phoneNumber": "+1234567890"
}
```

**Client Implementation:** `userService.updateUserProfile(userId, data)`

---

#### 6. Complete User Profile
**PATCH** `/api/v1/users/:id/complete-profile`

Complete user profile (self-service for new users).

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "department": "Engineering"
}
```

**Client Implementation:** `userService.completeUserProfile(userId, data)`

---

#### 7. Delete User
**DELETE** `/api/v1/users/:id`

Delete user (admin only).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "userId": "user-id"
}
```

**Client Implementation:** `userService.deleteUser(userId)`

---

#### 8. Get User Preferences
**GET** `/api/v1/users/:id/preferences`

Get user notification preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "alerts": true,
      "reports": true,
      "systemUpdates": false
    }
  }
}
```

**Client Implementation:** `userService.getUserPreferences(userId)`

---

#### 9. Update User Preferences
**PUT** `/api/v1/users/:id/preferences`

Update user notification preferences.

**Request Body:**
```json
{
  "email": {
    "alerts": true,
    "reports": false
  }
}
```

**Client Implementation:** `userService.updateUserPreferences(userId, preferences)`

---

#### 10. Reset User Preferences
**DELETE** `/api/v1/users/:id/preferences`

Reset user preferences to defaults.

**Client Implementation:** `userService.resetUserPreferences(userId)`

---

## Alerts Management

**Base Path:** `/api/v1/alerts`

**Authentication Required:** Yes

### Endpoints

#### 1. Get All Alerts
**GET** `/api/v1/alerts`

Get all alerts with optional filters.

**Query Parameters:**
- `status` - Filter by status (Unacknowledged/Acknowledged/Resolved)
- `severity` - Filter by severity (Critical/Warning/Advisory)
- `deviceId` - Filter by device ID
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "alert-id",
      "deviceId": "WQ-001",
      "severity": "Critical",
      "status": "Unacknowledged",
      "message": "pH level out of range",
      "createdAt": "2025-11-21T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

**Client Implementation:** `alertsService.getAlerts(filters)`

---

#### 2. Get Alert Statistics
**GET** `/api/v1/alerts/stats`

Get alert statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "acknowledged": 30,
    "resolved": 50,
    "unacknowledged": 20,
    "bySeverity": {
      "Critical": 10,
      "Warning": 40,
      "Advisory": 50
    }
  }
}
```

**Client Implementation:** `alertsService.getAlertStats()`

---

#### 3. Get Alert by ID
**GET** `/api/v1/alerts/:id`

Get specific alert by ID.

**Client Implementation:** `alertsService.getAlertById(alertId)`

---

#### 4. Acknowledge Alert
**PATCH** `/api/v1/alerts/:id/acknowledge`

Acknowledge an alert.

**Response:**
```json
{
  "success": true,
  "data": { /* updated alert */ },
  "message": "Alert acknowledged"
}
```

**Client Implementation:** `alertsService.acknowledgeAlert(alertId)`

---

#### 5. Resolve Alert
**PATCH** `/api/v1/alerts/:id/resolve`

Resolve an alert with optional notes.

**Request Body:**
```json
{
  "notes": "Water quality normalized after filter replacement"
}
```

**Client Implementation:** `alertsService.resolveAlert(alertId, notes)`

---

#### 6. Create Alert
**POST** `/api/v1/alerts`

Create new alert (internal/system use).

**Client Implementation:** `alertsService.createAlert(data)` (internal only)

---

#### 7. Delete Alert
**DELETE** `/api/v1/alerts/:id`

Delete alert (admin only).

**Client Implementation:** `alertsService.deleteAlert(alertId)`

---

## Devices Management

**Base Path:** `/api/v1/devices`

**Authentication Required:** Yes (except sensor data endpoint)

### Endpoints

#### 1. Get All Devices
**GET** `/api/v1/devices`

Get all devices with optional filters.

**Query Parameters:**
- `status` - Filter by status (online/offline)
- `registrationStatus` - Filter by registration (registered/pending)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "deviceId": "WQ-001",
      "deviceName": "Main Building Sensor",
      "location": "Building A - Floor 2",
      "status": "online",
      "registrationStatus": "registered",
      "lastReading": "2025-11-21T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

**Client Implementation:** `devicesService.getDevices(filters)`

---

#### 2. Get Device Statistics
**GET** `/api/v1/devices/stats`

Get device statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "online": 8,
    "offline": 2,
    "registered": 9,
    "unregistered": 1
  }
}
```

**Client Implementation:** `devicesService.getDeviceStats()`

---

#### 3. Get Device by ID
**GET** `/api/v1/devices/:id`

Get specific device by ID.

**Client Implementation:** `devicesService.getDeviceById(deviceId)`

---

#### 4. Get Device Readings
**GET** `/api/v1/devices/:id/readings`

Get sensor readings for a device.

**Query Parameters:**
- `limit` - Number of readings to return
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `page` - Page number

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "deviceId": "WQ-001",
      "pH": 7.2,
      "turbidity": 3.5,
      "TDS": 250,
      "timestamp": "2025-11-21T10:00:00Z"
    }
  ],
  "metadata": {
    "count": 100,
    "avgPH": 7.1,
    "avgTurbidity": 3.2,
    "avgTDS": 245
  }
}
```

**Client Implementation:** `devicesService.getDeviceReadings(deviceId, filters)`

---

#### 5. Update Device
**PATCH** `/api/v1/devices/:id`

Update device properties (admin only).

**Request Body:**
```json
{
  "location": "Building B - Floor 1",
  "registrationStatus": "registered",
  "deviceName": "Updated Sensor Name"
}
```

**Client Implementation:** `devicesService.updateDevice(deviceId, data)`

---

#### 6. Delete Device
**DELETE** `/api/v1/devices/:id`

Delete device (admin only).

**Client Implementation:** `devicesService.deleteDevice(deviceId)`

---

#### 7. Process Sensor Data
**POST** `/api/v1/devices/readings`

Process sensor data from IoT devices (requires API key).

**Headers:**
```
X-API-Key: <device-api-key>
```

**Request Body:**
```json
{
  "deviceId": "WQ-001",
  "pH": 7.2,
  "turbidity": 3.5,
  "TDS": 250
}
```

**Note:** This endpoint is for IoT devices only, not typically used by the client application.

---

## Reports Management

**Base Path:** `/api/v1/reports`

**Authentication Required:** Yes

### Endpoints

#### 1. Generate Water Quality Report
**POST** `/api/v1/reports/water-quality`

Generate water quality report for a date range.

**Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "deviceIds": ["WQ-001", "WQ-002"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "report-id",
    "type": "water-quality",
    "status": "completed",
    "data": { /* report data */ },
    "summary": { /* summary statistics */ }
  }
}
```

**Client Implementation:** `reportsService.generateWaterQualityReport(request)`

---

#### 2. Generate Device Status Report
**POST** `/api/v1/reports/device-status`

Generate device status report.

**Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Client Implementation:** `reportsService.generateDeviceStatusReport(request)`

---

#### 3. Get All Reports
**GET** `/api/v1/reports`

Get all generated reports with optional filters.

**Query Parameters:**
- `type` - Filter by type (water-quality/device-status)
- `status` - Filter by status (generating/completed/failed)
- `generatedBy` - Filter by user ID
- `page` - Page number
- `limit` - Items per page

**Client Implementation:** `reportsService.getReports(filters)`

---

#### 4. Get Report by ID
**GET** `/api/v1/reports/:id`

Get specific report by ID.

**Client Implementation:** `reportsService.getReportById(reportId)`

---

#### 5. Delete Report
**DELETE** `/api/v1/reports/:id`

Delete report (admin only).

**Client Implementation:** `reportsService.deleteReport(reportId)`

---

## Analytics

**Base Path:** `/api/v1/analytics`

**Authentication Required:** Yes

### Endpoints

#### 1. Get Dashboard Summary
**GET** `/api/v1/analytics/summary`

Get dashboard summary statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": {
      "total": 10,
      "online": 8,
      "offline": 2,
      "critical": 1
    },
    "alerts": {
      "total": 100,
      "active": 20,
      "critical": 5,
      "resolved": 80
    },
    "readings": {
      "totalToday": 500,
      "avgCompliance": 95.5
    },
    "lastUpdated": "2025-11-21T10:00:00Z"
  }
}
```

**Client Implementation:** `analyticsService.getSummary()`

---

#### 2. Get Water Quality Trends
**GET** `/api/v1/analytics/trends`

Get time-series water quality trends.

**Query Parameters:**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `parameter` - Parameter to analyze (pH/Turbidity/TDS)
- `granularity` - Time granularity (hour/day/week/month)
- `deviceIds` - Comma-separated device IDs

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-21",
      "avgPH": 7.1,
      "avgTurbidity": 3.2,
      "avgTDS": 245,
      "readingCount": 50
    }
  ]
}
```

**Client Implementation:** `analyticsService.getTrends(params)`

---

#### 3. Get Parameter Analytics
**GET** `/api/v1/analytics/parameters`

Get parameter-specific analytics.

**Query Parameters:**
- `parameter` - Parameter to analyze (pH/Turbidity/TDS)
- `startDate` - Start date
- `endDate` - End date

**Response:**
```json
{
  "success": true,
  "data": {
    "distribution": {
      "min": 6.5,
      "max": 8.0,
      "avg": 7.2,
      "median": 7.1,
      "stdDev": 0.3
    },
    "histogram": [
      { "range": "6.5-7.0", "count": 10 },
      { "range": "7.0-7.5", "count": 50 },
      { "range": "7.5-8.0", "count": 30 }
    ],
    "complianceRate": 95.5,
    "trendDirection": "stable"
  }
}
```

**Client Implementation:** `analyticsService.getParameterAnalytics(params)`

---

## Client Service Layer

### Import and Usage

All client services are implemented as classes and can be imported from the services directory:

```typescript
import { authService } from '@/services/auth.Service';
import { userService } from '@/services/user.Service';
import { alertsService } from '@/services/alerts.Service';
import { devicesService } from '@/services/devices.Service';
import { reportsService } from '@/services/reports.Service';
import { analyticsService } from '@/services/analytics.service';
```

### Authentication Flow

1. **Client-Side Firebase Authentication:**
```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/config/firebase';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const idToken = await result.user.getIdToken();
```

2. **Verify Token with Backend:**
```typescript
const response = await authService.verifyToken(idToken);
// User is now synced to MongoDB
```

3. **Subsequent API Calls:**
All API calls automatically include the Firebase ID token in the `Authorization` header via the axios interceptor configured in `api.config.ts`.

### Error Handling

All services use centralized error handling:

```typescript
try {
  const response = await userService.getAllUsers();
} catch (error) {
  // Error is already formatted by getErrorMessage()
  console.error(error.message);
}
```

### Pagination

Endpoints that support pagination follow this pattern:

```typescript
const response = await userService.getAllUsers({
  page: 1,
  limit: 20,
  role: 'staff'
});

console.log(response.pagination);
// { total: 100, page: 1, limit: 20, pages: 5 }
```

---

## Environment Variables

Required environment variables for the server:

```env
# MongoDB
MONGO_URI=mongodb+srv://...

# Server
PORT=5000
NODE_ENV=production

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-project-id

# CORS
CLIENT_URL=http://localhost:5173

# Device API Key (for ESP32 sensors)
DEVICE_API_KEY=your-api-key-here

# SMTP (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password

# Redis (optional, for email queue)
REDIS_URL=redis://...
```

---

## Rate Limiting

The API implements rate limiting:

- **General API routes:** 100 requests per 15 minutes per IP
- **Sensor data:** 1000 requests per 15 minutes per IP
- **Report generation:** 10 requests per 15 minutes per user

---

## API Versioning

Current version: **v1**

All versioned endpoints are prefixed with `/api/v1`. Future versions will use `/api/v2`, etc.

---

## Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Support

For API issues or questions, contact the development team.
