# 🚀 COMPLETE FIREBASE TO EXPRESS MIGRATION PLAN

## 📊 CURRENT ARCHITECTURE ANALYSIS

### Firebase Cloud Functions (Functions Folder)
```
functions/src_new/callable/
├── Users.ts          → User management & notification preferences
├── Alerts.ts         → Alert acknowledgment & resolution
├── Devices.ts        → Device update & delete
└── Reports.ts        → Water quality & device status reports
```

### Firebase Services Used in Client
```
1. **Firebase Authentication** → ✅ MIGRATED to Express/Passport.js
2. **Firestore Database** → ⚠️ NEEDS MIGRATION to MongoDB
3. **Realtime Database (RTDB)** → ⚠️ NEEDS MIGRATION to MongoDB
4. **Cloud Functions** → ⚠️ NEEDS MIGRATION to Express REST API
5. **Cloud Storage** → ❌ NOT USED (no file uploads detected)
```

---

## 🔍 DETAILED FIREBASE USAGE BREAKDOWN

### 1. USER MANAGEMENT (functions/callable/Users.ts)
**Current Firebase Cloud Function Actions:**
- `listUsers` - Get all users from Firestore
- `updateStatus` - Change user status (Pending/Approved/Suspended)
- `updateUser` - Change user role and/or status
- `updateUserProfile` - Update name, department, phone
- `deleteUser` - Delete from Firebase Auth + Firestore
- `getUserPreferences` - Get notification preferences from subcollection
- `setupPreferences` - Create/update notification preferences
- `deletePreferences` - Remove notification preferences
- `listAllPreferences` - Get all users' notification preferences

**Migration Status:** ✅ **COMPLETED**
- User CRUD endpoints implemented
- Notification preferences need separate MongoDB collection

---

### 2. ALERT MANAGEMENT (functions/callable/Alerts.ts)
**Current Firebase Cloud Function Actions:**
- `acknowledgeAlert` - Mark alert as acknowledged
- `resolveAlert` - Mark alert as resolved with notes

**Client Services:**
- `alerts.Service.ts` - Uses Firestore onSnapshot for real-time alerts
- Real-time listener on `alerts` collection

**Data Flow:**
```
RTDB (sensor data) → PubSub (processSensorData) → Firestore (alerts) → Client (real-time)
```

**Migration Status:** ❌ **PENDING**
- Need MongoDB alerts collection
- Need Express endpoints: PATCH /api/alerts/:id/acknowledge, PATCH /api/alerts/:id/resolve
- Need polling or WebSocket for real-time alerts

---

### 3. DEVICE MANAGEMENT (functions/callable/Devices.ts)
**Current Firebase Cloud Function Actions:**
- `updateDevice` - Update device metadata (location, name, etc.)
- `deleteDevice` - Delete from Firestore + RTDB

**Background Functions:**
- `autoRegisterDevice` (PubSub) - Auto-create devices when detected via MQTT
- `processSensorData` (PubSub) - Process incoming sensor readings
- `checkOfflineDevices` (Scheduler) - Mark devices offline after 5 mins

**Client Services:**
- `devices.Service.ts` - Uses Firestore queries + RTDB for sensor data
- Real-time data from RTDB path: `sensorReadings/{deviceId}/latest`

**Data Flow:**
```
MQTT → Bridge → PubSub → RTDB (real-time readings) → Firestore (device metadata)
```

**Migration Status:** ❌ **PENDING**
- Need MongoDB collections: devices, sensorReadings
- Need Express endpoints: GET/PATCH/DELETE /api/devices
- Need PubSub replacement (MQTT Bridge can call Express directly)
- Need scheduler replacement (node-cron)

---

### 4. REPORTS GENERATION (functions/callable/Reports.ts)
**Current Firebase Cloud Function Actions:**
- `generateWaterQualityReport` - Aggregate sensor readings + alerts
- `generateDeviceStatusReport` - Device health metrics

**Data Sources:**
- Firestore: devices, alerts collections
- RTDB: sensorReadings/{deviceId}/history (last 100 readings)

**Migration Status:** ❌ **PENDING**
- Need Express endpoints: POST /api/reports/water-quality, POST /api/reports/device-status
- Need MongoDB aggregation pipelines for report generation

---

### 5. ANALYTICS (functions - Not callable, client-side only)
**Client Services:**
- `analytics.service.ts` - Queries Firestore for historical data

**Migration Status:** ❌ **PENDING**
- Need Express endpoint: GET /api/analytics/...

---

## 🏗️ EXPRESS SERVER MIGRATION PLAN

### Phase 1: Core Infrastructure ✅ DONE
- [x] Express server setup
- [x] MongoDB connection
- [x] Passport.js authentication
- [x] Session management
- [x] User management endpoints

### Phase 2: Alert System 🔄 IN PROGRESS
**Server Side:**
```javascript
// MongoDB Schema
const AlertSchema = new mongoose.Schema({
  alertId: String,          // UUID
  deviceId: String,
  deviceName: String,
  severity: String,         // Critical, Warning, Advisory
  parameter: String,        // pH, Turbidity, TDS, Temperature
  value: Number,
  threshold: Number,
  message: String,
  status: String,           // Unacknowledged, Acknowledged, Resolved
  acknowledgedAt: Date,
  acknowledgedBy: String,   // User ID
  resolvedAt: Date,
  resolvedBy: String,
  resolutionNotes: String,
  timestamp: Date,
}, { timestamps: true });

// Express Routes
PATCH /api/alerts/:id/acknowledge  - Acknowledge alert
PATCH /api/alerts/:id/resolve      - Resolve alert with notes
GET   /api/alerts                  - List alerts (with filters)
GET   /api/alerts/:id              - Get single alert
```

**Client Side:**
- Update `alerts.Service.ts` to use Express API
- Replace Firestore onSnapshot with polling
- Update hooks: `useRealtime_Alerts`, `useCall_Alerts`

### Phase 3: Device Management
**Server Side:**
```javascript
// MongoDB Schemas
const DeviceSchema = new mongoose.Schema({
  deviceId: String,         // ESP32_XXXXXX
  location: String,
  status: String,          // online, offline
  lastSeen: Date,
  registrationStatus: String,  // registered, pending
  createdAt: Date,
  updatedAt: Date,
});

const SensorReadingSchema = new mongoose.Schema({
  deviceId: String,
  pH: Number,
  turbidity: Number,
  tds: Number,
  temperature: Number,
  receivedAt: Date,
  timestamp: Date,
});

// Express Routes
GET    /api/devices                   - List devices
GET    /api/devices/:id               - Get device details
GET    /api/devices/:id/readings      - Get sensor readings (paginated)
PATCH  /api/devices/:id               - Update device
DELETE /api/devices/:id               - Delete device
POST   /api/devices/readings          - Receive sensor data (from MQTT Bridge)
```

**MQTT Bridge Integration:**
- Update mqtt-bridge/index.js to POST to Express instead of PubSub
- Remove Firebase dependencies from MQTT Bridge

**Background Jobs (node-cron):**
- Check offline devices every 5 minutes
- Clean up old sensor readings

### Phase 4: Reports Generation
**Server Side:**
```javascript
// Express Routes
POST /api/reports/water-quality   - Generate water quality report
POST /api/reports/device-status   - Generate device status report
GET  /api/reports                 - List generated reports
GET  /api/reports/:id             - Get report details

// MongoDB Aggregation Pipelines
- Aggregate sensor readings by device and time range
- Calculate min/max/avg for each parameter
- Join with alerts data
- Generate compliance metrics
```

### Phase 5: Analytics
**Server Side:**
```javascript
// Express Routes
GET /api/analytics/trends         - Water quality trends
GET /api/analytics/summary        - Dashboard summary stats
GET /api/analytics/parameters     - Parameter-specific analytics
```

### Phase 6: Notification Preferences
**Server Side:**
```javascript
// MongoDB Schema
const NotificationPreferencesSchema = new mongoose.Schema({
  userId: String,
  email: String,
  emailNotifications: Boolean,
  pushNotifications: Boolean,
  sendScheduledAlerts: Boolean,
  alertSeverities: [String],
  parameters: [String],
  devices: [String],
  quietHoursEnabled: Boolean,
  quietHoursStart: String,
  quietHoursEnd: String,
}, { timestamps: true });

// Express Routes (nested under users)
GET    /api/users/:id/preferences        - Get user preferences
PUT    /api/users/:id/preferences        - Update preferences
DELETE /api/users/:id/preferences        - Delete preferences
GET    /api/preferences                  - List all (admin only)
```

---

## 📋 MIGRATION CHECKLIST

### Server Implementation
- [ ] **Alerts Module**
  - [ ] Create Alert model (MongoDB)
  - [ ] Create alerts controller
  - [ ] Create alerts routes
  - [ ] Add middleware (auth, admin)

- [ ] **Devices Module**
  - [ ] Create Device model
  - [ ] Create SensorReading model
  - [ ] Create devices controller
  - [ ] Create devices routes
  - [ ] Add background job (check offline)

- [ ] **Reports Module**
  - [ ] Create Report model
  - [ ] Create reports controller
  - [ ] Create reports routes
  - [ ] Implement aggregation pipelines

- [ ] **Analytics Module**
  - [ ] Create analytics controller
  - [ ] Create analytics routes

- [ ] **Notification Preferences**
  - [ ] Create NotificationPreferences model
  - [ ] Add preferences routes (nested under users)
  - [ ] Update user controller

### MQTT Bridge Updates
- [ ] Replace Firebase PubSub with Express API calls
- [ ] Update sensor data endpoint
- [ ] Remove Firebase dependencies

### Client Updates
- [ ] **alerts.Service.ts**
  - [ ] Replace Firestore onSnapshot with polling
  - [ ] Replace Cloud Functions with Express API
  
- [ ] **devices.Service.ts**
  - [ ] Replace Firestore queries with Express API
  - [ ] Replace RTDB reads with Express API
  
- [ ] **reports.Service.ts**
  - [ ] Replace Cloud Functions with Express API
  
- [ ] **analytics.service.ts**
  - [ ] Replace Firestore queries with Express API

- [ ] **Hooks Updates**
  - [ ] `useRealtime_Alerts` - Polling instead of Firestore
  - [ ] `useRealtime_Devices` - Polling instead of Firestore
  - [ ] `useRealtime_AnalyticsData` - Polling instead of Firestore
  - [ ] `useCall_Alerts` - Already compatible
  - [ ] `useCall_Devices` - Already compatible
  - [ ] `useCall_Reports` - Already compatible

### Configuration & Environment
- [ ] Remove Firebase config from client
- [ ] Remove Firebase dependencies from package.json
- [ ] Update .env files

---

## 🎯 IMPLEMENTATION ORDER

1. **Alerts System** (High Priority - Core functionality)
   - Server: Models, Controllers, Routes
   - Client: Service layer, Hooks

2. **Devices System** (High Priority - Core functionality)
   - Server: Models, Controllers, Routes, Background jobs
   - MQTT Bridge: Remove Firebase, call Express
   - Client: Service layer, Hooks

3. **Reports System** (Medium Priority)
   - Server: Controller, Routes, Aggregations
   - Client: Service layer, Hooks

4. **Analytics System** (Medium Priority)
   - Server: Controller, Routes
   - Client: Service layer, Hooks

5. **Notification Preferences** (Low Priority)
   - Server: Model, Routes under users
   - Client: Already uses user service

6. **Firebase Removal** (Final cleanup)
   - Remove all Firebase imports
   - Remove Firebase dependencies
   - Clean up old code

---

## 📊 DATA MIGRATION STRATEGY

### Option 1: Dual-Write Period (Recommended)
1. Keep Firebase running
2. Implement Express endpoints
3. Write to both Firebase and MongoDB
4. Verify data consistency
5. Switch client to Express
6. Stop Firebase writes
7. Decommission Firebase

### Option 2: Big Bang Migration
1. Export all data from Firestore/RTDB
2. Import into MongoDB
3. Switch client to Express
4. Decommission Firebase immediately

**Recommendation:** Use Option 1 for safer migration with rollback capability.

---

## 🔧 TESTING STRATEGY

1. **Unit Tests** - Each Express endpoint
2. **Integration Tests** - End-to-end flows
3. **Load Tests** - Sensor data ingestion rate
4. **Compatibility Tests** - Client UI with new backend
5. **Migration Tests** - Data consistency verification

---

## 📝 NOTES

- **Real-time Requirements:** Current system uses Firestore onSnapshot. Express migration will use polling (5-10 second intervals) or WebSockets for true real-time.
- **MQTT Bridge:** Critical component that needs careful migration to avoid sensor data loss.
- **Background Jobs:** Firebase Cloud Scheduler → node-cron in Express.
- **Email Notifications:** Already using nodemailer (functions/utils/emailService.ts) - can be reused in Express.
- **PubSub Pattern:** Firebase PubSub → Express event emitters or message queue (RabbitMQ/Redis).

---

## ⚠️ RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Dual-write period, backups |
| Downtime during cutover | Medium | Blue-green deployment |
| Performance degradation | Medium | Load testing, caching |
| Client compatibility issues | High | Gradual rollout, feature flags |
| MQTT Bridge failure | Critical | Extensive testing, monitoring |

---

## 📅 ESTIMATED TIMELINE

- **Alerts System:** 2-3 days
- **Devices System:** 3-4 days (includes MQTT Bridge)
- **Reports System:** 2-3 days
- **Analytics System:** 2 days
- **Notification Preferences:** 1 day
- **Testing & QA:** 3-4 days
- **Deployment & Monitoring:** 1-2 days

**Total:** ~15-20 days for complete migration
