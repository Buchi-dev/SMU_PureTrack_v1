# Firebase Functions Quick Reference Guide

**Water Quality Monitoring System - Developer Cheat Sheet**

Quick reference for common Firebase Functions operations, patterns, and troubleshooting.

---

## 🚀 Common Commands

### Development
```bash
# Install dependencies
cd functions && npm ci

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Build TypeScript
npm run build

# Watch mode (auto-rebuild)
npm run build:watch
```

### Local Testing
```bash
# Start Firebase emulators
npm run serve

# Run functions shell (interactive)
npm run shell

# Test specific function
firebase functions:shell
> processSensorData({data: {message: {json: {...}}}})
```

### Deployment
```bash
# Deploy all functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:processSensorData

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# View deployed functions
firebase functions:list
```

### Monitoring
```bash
# View real-time logs
firebase functions:log

# View specific function logs
firebase functions:log --only processSensorData

# Last 100 lines
firebase functions:log --lines 100

# Follow logs (tail -f)
firebase functions:log --follow
```

---

## 📊 Function Inventory

### Authentication (Blocking Functions)
| Function | Trigger | Purpose |
|----------|---------|---------|
| `beforeCreate` | User creation | Validate @smu.edu.ph domain, create profile |
| `beforeSignIn` | Sign-in attempt | Audit logging, profile verification |

### Callable Functions (Client → Server)
| Function | Actions | Auth | Admin Only |
|----------|---------|------|------------|
| `userManagement` | updateStatus, updateUser, listUsers | ✅ | ✅ |
| `deviceManagement` | discoverDevices, sendCommand, addDevice, listDevices, getLatestReading | ✅ | ❌ |
| `alertManagement` | acknowledgeAlert, resolveAlert, listAlerts | ✅ | Mixed |
| `notificationPreferences` | setupPreferences, getUserPreferences, deletePreferences | ✅ | ❌ |
| `generateReport` | generateWaterQualityReport | ✅ | ❌ |

### Pub/Sub Triggers (Event-Driven)
| Function | Topic | Priority | Purpose |
|----------|-------|----------|---------|
| `processSensorData` | iot-sensor-readings | P0 | Process sensor data, create alerts |
| `aggregateAlertsToDigest` | Firestore trigger (alerts) | P1 | Batch alerts into digests |
| `autoRegisterDevice` | iot-device-registration | P2 | Auto-register devices |
| `monitorDeviceStatus` | iot-device-status | P2 | Track device health |

### Scheduled Functions (Cron Jobs)
| Function | Schedule | Timezone | Purpose |
|----------|----------|----------|---------|
| `sendAlertDigests` | Every 6 hours | UTC | Send batched alert emails |
| `checkStaleAlerts` | Every 1 hour | Asia/Manila | Monitor unresolved critical alerts |
| `sendDailyAnalytics` | 6:00 AM daily | Asia/Manila | 24-hour analytics reports |
| `sendWeeklyAnalytics` | 7:00 AM Monday | Asia/Manila | 7-day analytics reports |
| `sendMonthlyAnalytics` | 8:00 AM 1st | Asia/Manila | 30-day analytics reports |

---

## 🏗️ Architecture Patterns

### Switch-Case Routing (Callable Functions)

**Pattern:**
```typescript
import { createRoutedFunction } from "../utils/switchCaseRouting";

export const myFunction = onCall<MyRequest, MyResponse>(
  { region: "us-central1" },
  createRoutedFunction({
    action1: handleAction1,
    action2: handleAction2,
    action3: handleAction3,
  })
);

async function handleAction1(req: CallableRequest<MyRequest>): Promise<MyResponse> {
  // Implementation
}
```

**Client Usage:**
```typescript
const myFunc = httpsCallable(functions, 'myFunction');
await myFunc({ action: 'action1', param1: 'value' });
```

### Centralized Constants

**Always use constants, never hardcode:**
```typescript
// ❌ Bad
db.collection("alerts").where("status", "==", "Active")

// ✅ Good
import { COLLECTIONS } from "../constants";
db.collection(COLLECTIONS.ALERTS).where("status", "==", "Active")
```

### Validators

**Always validate inputs:**
```typescript
import { isValidDeviceId, isValidSensorReading } from "../utils/validators";

if (!isValidDeviceId(deviceId)) {
  throw new HttpsError("invalid-argument", "Invalid device ID format");
}

if (!isValidSensorReading({ turbidity, tds, ph })) {
  throw new HttpsError("invalid-argument", "Sensor values out of range");
}
```

---

## 🔒 Security Checklist

### Callable Function Template
```typescript
export const myCallable = onCall(
  { region: "us-central1" },
  async (request: CallableRequest<MyRequest>): Promise<MyResponse> => {
    // 1. ✅ Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    // 2. ✅ Check role (if admin-only)
    const userRole = request.auth.token.role;
    if (userRole !== "Admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    // 3. ✅ Validate input
    const { param1 } = request.data;
    if (!param1 || typeof param1 !== "string") {
      throw new HttpsError("invalid-argument", "Invalid param1");
    }

    try {
      // 4. ✅ Business logic
      const result = await doSomething(param1);
      
      // 5. ✅ Return success
      return { success: true, data: result };
    } catch (error) {
      // 6. ✅ Handle errors
      logger.error("Error in myCallable:", error);
      throw new HttpsError("internal", "Operation failed");
    }
  }
);
```

---

## 📝 Firestore Collections

| Collection | Read Access | Write Access | Purpose |
|------------|-------------|--------------|---------|
| `users` | User/Admin | User (profile) / Admin (role) / **Functions only (create)** | User profiles with RBAC |
| `devices` | All auth | **Functions only** | IoT device registry |
| `alerts` | All auth | Admin (status) / **Functions only (create)** | Water quality alerts |
| `alerts_digests` | User/Admin | Public (token) / **Functions only** | Batched alert notifications |
| `notification_preferences` | User/Admin | User-owned | Notification settings |
| `alertSettings` | All auth | Admin only | Threshold configuration |
| `sensor_readings` | All auth | **Functions only** | Historical sensor data |
| `login_logs` | **Functions only** | **Functions only** | Authentication audit |
| `business_logs` | **Functions only** | **Functions only** | Business action audit |

---

## 🎯 Common Patterns

### Get Document with Error Handling
```typescript
const deviceRef = db.collection(COLLECTIONS.DEVICES).doc(deviceId);
const deviceDoc = await deviceRef.get();

if (!deviceDoc.exists) {
  throw new HttpsError("not-found", "Device not found");
}

const device = deviceDoc.data() as Device;
```

### Update with Server Timestamp
```typescript
import * as admin from "firebase-admin";

await deviceRef.update({
  lastSeen: admin.firestore.FieldValue.serverTimestamp(),
  status: "online",
});
```

### Query with Pagination
```typescript
const alertsQuery = db.collection(COLLECTIONS.ALERTS)
  .where("status", "==", "Active")
  .orderBy("createdAt", "desc")
  .limit(50);

const snapshot = await alertsQuery.get();
const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### Batch Operations
```typescript
const batch = db.batch();

alerts.forEach(alert => {
  const ref = db.collection(COLLECTIONS.ALERTS).doc(alert.id);
  batch.update(ref, { status: "Resolved" });
});

await batch.commit();
```

### Transaction (Race Condition Safe)
```typescript
await db.runTransaction(async (transaction) => {
  const digestRef = db.collection(DIGEST_COLLECTION).doc(digestId);
  const digestDoc = await transaction.get(digestRef);

  if (!digestDoc.exists) {
    // Create new digest
    transaction.set(digestRef, newDigest);
  } else {
    // Update existing digest
    transaction.update(digestRef, updates);
  }
});
```

---

## 🐛 Troubleshooting

### Issue: Function times out
**Symptoms:** Function execution exceeds 60 seconds  
**Solution:**
```typescript
// Set higher timeout in function config
export const myFunction = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 300, // 5 minutes
    memory: "1GiB",
  },
  async (request) => { /* ... */ }
);
```

### Issue: Permission denied on Firestore
**Symptoms:** `PERMISSION_DENIED: Missing or insufficient permissions`  
**Causes:**
1. Security rules blocking access
2. Unauthenticated request
3. Missing custom claims

**Debug:**
```bash
# Check Firestore rules
firebase firestore:rules

# Test rules in Firebase Console
# Firestore → Rules → Rules Playground
```

### Issue: Index not found
**Symptoms:** `The query requires an index`  
**Solution:**
```bash
# Click the index creation link in error message, or
firebase deploy --only firestore:indexes

# Check index status
firebase firestore:indexes
```

### Issue: Cold start latency
**Symptoms:** First invocation takes 5-10 seconds  
**Solutions:**
1. Use minimum instances for critical functions:
   ```typescript
   {
     minInstances: 1, // Keeps warm instance
   }
   ```
2. Optimize imports (avoid large packages in global scope)
3. Use lazy initialization

### Issue: Quota exceeded
**Symptoms:** `Resource exhausted` or rate limit errors  
**Check:**
```bash
# View quota usage
gcloud monitoring dashboards list

# Check Firestore operations
firebase firestore:operations
```

**Solutions:**
1. Implement caching (already done with debouncing)
2. Add pagination to queries
3. Use batch processing (already implemented)

### Issue: MQTT bridge not receiving data
**Symptoms:** No sensor data in Firestore  
**Debug Steps:**
1. Check MQTT bridge logs:
   ```bash
   gcloud run logs read mqtt-bridge --limit 50
   ```
2. Verify device firmware is publishing:
   - Check Arduino serial monitor
   - Verify WiFi connection
   - Check MQTT credentials
3. Check Pub/Sub topic:
   ```bash
   gcloud pubsub topics list
   gcloud pubsub subscriptions list
   ```
4. Verify function is listening:
   ```bash
   firebase functions:log --only processSensorData
   ```

---

## 📊 Performance Tips

### Query Optimization
```typescript
// ❌ Bad: Fetches all documents then filters
const all = await db.collection(COLLECTIONS.ALERTS).get();
const active = all.docs.filter(doc => doc.data().status === "Active");

// ✅ Good: Server-side filtering with index
const active = await db.collection(COLLECTIONS.ALERTS)
  .where("status", "==", "Active")
  .get();
```

### Debouncing Pattern (Already Implemented)
```typescript
const alertCache = new Map<string, number>();
const COOLDOWN_MS = 300000; // 5 minutes

const cacheKey = `${deviceId}-${parameter}`;
const lastAlertTime = alertCache.get(cacheKey) || 0;

if (Date.now() - lastAlertTime < COOLDOWN_MS) {
  return; // Skip duplicate alert
}

alertCache.set(cacheKey, Date.now());
```

### Batch Processing (Already Implemented)
```typescript
// Device sends batch of 10 readings every 5 minutes
// Reduces Pub/Sub operations by 90%

const isBatch = Array.isArray((messageData as BatchSensorData).readings);
const readingsArray = isBatch
  ? (messageData as BatchSensorData).readings
  : [messageData as SensorData];
```

---

## 🔗 Useful Links

### Documentation
- [Firebase Functions v2 Docs](https://firebase.google.com/docs/functions/beta-v2)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

### Tools
- [Firebase Console](https://console.firebase.google.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [Cloud Monitoring](https://console.cloud.google.com/monitoring)

### Internal Documentation
- **Full Validation Report:** `FIREBASE_VALIDATION_REPORT.md`
- **Implementation Guide:** `IMPLEMENTATION_GUIDE.md`
- **CI/CD Workflow:** `.github/workflows/firebase-functions-ci.yml`

---

## 📞 Getting Help

### Error Messages
1. Check function logs: `firebase functions:log --only functionName`
2. Search Firebase documentation
3. Check GitHub issues: [firebase/firebase-functions](https://github.com/firebase/firebase-functions)

### Architecture Questions
1. Review `FIREBASE_VALIDATION_REPORT.md` for system overview
2. Check function source code documentation (JSDoc)
3. Review `functions/src/constants/` for configuration values

### Security Concerns
1. Review `firestore.rules` for access patterns
2. Check authentication flow in `functions/src/auth/`
3. Verify role checks in callable functions

---

**Last Updated:** November 2, 2025  
**Version:** 1.0  
**Maintained By:** Firebase Cloud Architect AI
